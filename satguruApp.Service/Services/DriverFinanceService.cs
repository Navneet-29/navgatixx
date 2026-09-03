using Microsoft.EntityFrameworkCore;
using satguruApp.DLL.Models;
using satguruApp.Service.Services.Interfaces;
using satguruApp.Service.ViewModels;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace satguruApp.Service.Services
{
    public class DriverFinanceService : IDriverFinanceService
    {
        private const string RidePaymentMode = "ride_payment";
        private const string CashCommissionMode = "cash_commission";
        private const string WithdrawalMode = "withdrawal";

        private readonly SatguruDBContext _db;

        public DriverFinanceService(SatguruDBContext db)
        {
            _db = db;
        }

        public async Task<DriverWalletSummaryViewModel> GetWalletSummaryAsync(string driverUserId)
        {
            var summary = new DriverWalletSummaryViewModel { DriverUserId = driverUserId };
            if (string.IsNullOrWhiteSpace(driverUserId))
            {
                return summary;
            }

            var driver = await _db.Drivers.FirstOrDefaultAsync(x => x.UserId == driverUserId && x.IsDeleted != true);
            var marker = DriverMarker(driverUserId);
            var todayUtc = DateTime.UtcNow.Date;

            // 1. Calculate net earnings from recorded paid transactions today (both Cash net and Online net)
            var todaysPayments = await _db.Payments
                .Where(x => x.IsDeleted != true
                            && x.PaymentStatus == "paid"
                            && x.PaidAt >= todayUtc
                            && x.TransactionReference != null
                            && x.TransactionReference.Contains(marker))
                .ToListAsync();

            decimal todaysEarningsFromPayments = 0;
            var paidRideIdsToday = new HashSet<long>();

            foreach (var p in todaysPayments)
            {
                if (p.PaymentMode == CashCommissionMode)
                {
                    // For cash payment, payment record stores commission (10%).
                    // Net driver earning = Gross fare (Amount / 0.10) * 0.90 = Amount * 9.
                    var netCashEarning = (p.Amount ?? 0) * 9m;
                    todaysEarningsFromPayments += netCashEarning;

                    // Track rideId if present
                    if (p.TransactionReference != null)
                    {
                        var match = System.Text.RegularExpressions.Regex.Match(p.TransactionReference, @"RIDE:(\d+)");
                        if (match.Success && long.TryParse(match.Groups[1].Value, out var rId))
                        {
                            paidRideIdsToday.Add(rId);
                        }
                    }
                }
                else if (p.PaymentMode == RidePaymentMode)
                {
                    // Online UPI payment record stores net credited amount (90%) directly
                    todaysEarningsFromPayments += (p.Amount ?? 0);

                    if (p.TransactionReference != null)
                    {
                        var match = System.Text.RegularExpressions.Regex.Match(p.TransactionReference, @"RIDE:(\d+)");
                        if (match.Success && long.TryParse(match.Groups[1].Value, out var rId))
                        {
                            paidRideIdsToday.Add(rId);
                        }
                    }
                }
            }

            // 2. Also include any completed rides today that might not have a separate payment record yet
            if (driver != null)
            {
                const decimal CommissionRate = 0.10m;
                var completedRides = await _db.Bookings
                    .Where(x => x.DriverId == driver.Id 
                                && x.CT_BookingStatus == RideStatus.RideCompleted 
                                && x.IsDeleted != true 
                                && x.CreatedAt >= todayUtc)
                    .ToListAsync();

                foreach (var r in completedRides)
                {
                    if (!paidRideIdsToday.Contains(r.Id))
                    {
                        var net = (r.FinalFare ?? r.EstimatedFare ?? 0) * (1.0m - CommissionRate);
                        todaysEarningsFromPayments += net;
                    }
                }
            }

            summary.TotalEarnings = todaysEarningsFromPayments;
            summary.TotalRidePayments = await _db.Payments
                .Where(x => x.IsDeleted != true
                            && (x.PaymentMode == RidePaymentMode || x.PaymentMode == CashCommissionMode)
                            && x.PaymentStatus == "paid"
                            && x.TransactionReference != null
                            && x.TransactionReference.Contains(marker))
                .Select(x => x.Amount ?? 0)
                .SumAsync();

            summary.PendingWithdrawalAmount = await _db.Payments
                .Where(x => x.IsDeleted != true
                            && x.PaymentMode == WithdrawalMode
                            && x.PaymentStatus == "pending"
                            && x.TransactionReference != null
                            && x.TransactionReference.Contains(marker))
                .Select(x => x.Amount ?? 0)
                .SumAsync();

            summary.PendingWithdrawalCount = await _db.Payments
                .CountAsync(x => x.IsDeleted != true
                                 && x.PaymentMode == WithdrawalMode
                                 && x.PaymentStatus == "pending"
                                 && x.TransactionReference != null
                                 && x.TransactionReference.Contains(marker));

            var wallet = await EnsureWalletAsync(driverUserId);
            summary.CurrentBalance = wallet.Balance ?? 0;
            if (driver != null)
            {
                summary.HasTransactionPIN = !string.IsNullOrWhiteSpace(driver.TransactionPIN);
            }
            return summary;
        }

        public async Task<DriverFinanceResultViewModel> RecordRidePaymentAsync(RidePaymentRequestViewModel model)
        {
            if (model.RideId <= 0 || model.Amount <= 0)
            {
                return Fail("RideId and Amount are required.");
            }

            var ride = await _db.Bookings.FirstOrDefaultAsync(x => x.Id == model.RideId && x.IsDeleted != true);
            if (ride == null)
            {
                return Fail("Ride not found.");
            }
            if (!ride.DriverId.HasValue)
            {
                return Fail("Ride has no assigned driver.");
            }

            var driver = await _db.Drivers.FirstOrDefaultAsync(x => x.Id == ride.DriverId.Value && x.IsDeleted != true);
            if (driver == null || string.IsNullOrWhiteSpace(driver.UserId))
            {
                return Fail("Driver not found for this ride.");
            }

            var marker = DriverMarker(driver.UserId);
            var alreadyPaid = await _db.Payments.AnyAsync(p => p.IsDeleted != true 
                && p.PaymentStatus == "paid" 
                && p.TransactionReference != null 
                && (p.TransactionReference.Contains($"RIDE:{model.RideId}") || p.TransactionReference.Contains($"Ride_{model.RideId}")));

            if (alreadyPaid)
            {
                var currentWallet = await EnsureWalletAsync(driver.UserId);
                return Success("Payment for this ride was already recorded earlier.", Guid.Empty, currentWallet.Balance ?? 0);
            }

            var wallet = await EnsureWalletAsync(driver.UserId);
            var isCash = string.Equals(model.PaymentMode, "Cash", StringComparison.OrdinalIgnoreCase);

            if (!ride.FinalFare.HasValue || ride.FinalFare.Value <= 0)
            {
                ride.FinalFare = model.Amount;
            }

            if (isCash)
            {
                // CASH FLOW:
                // Driver takes full physical cash in hand.
                // App Commission (10%) is deducted from the driver's in-app wallet balance.
                var commission = model.Amount * 0.10m;
                wallet.Balance = (wallet.Balance ?? 0) - commission;
                wallet.UpdatedAt = DateTime.UtcNow;

                var payment = new Payment
                {
                    Id = Guid.NewGuid(),
                    BookingId = null,
                    Amount = commission,
                    PaymentMode = CashCommissionMode,
                    PaymentStatus = "paid",
                    TransactionReference = $"CASH_COMMISSION|RIDE:{model.RideId}|{DriverMarker(driver.UserId)}",
                    PaidAt = DateTime.UtcNow,
                    IsDeleted = false,
                };
                _db.Payments.Add(payment);

                await _db.SaveChangesAsync();
                return Success($"Cash payment of ₹{model.Amount} confirmed. Commission of ₹{commission:F2} deducted from wallet.", payment.Id, wallet.Balance ?? 0);
            }
            else
            {
                // ONLINE (UPI/QR) FLOW:
                // Customer pays digitally to platform.
                // Net Driver Earnings (90%) are credited to the driver's in-app wallet balance.
                var netCredited = model.Amount * 0.90m;
                wallet.Balance = (wallet.Balance ?? 0) + netCredited;
                wallet.UpdatedAt = DateTime.UtcNow;

                var payment = new Payment
                {
                    Id = Guid.NewGuid(),
                    BookingId = null,
                    Amount = netCredited,
                    PaymentMode = RidePaymentMode,
                    PaymentStatus = "paid",
                    TransactionReference = $"{(string.IsNullOrWhiteSpace(model.TransactionReference) ? $"RIDE:{model.RideId}" : model.TransactionReference)}|{DriverMarker(driver.UserId)}",
                    PaidAt = DateTime.UtcNow,
                    IsDeleted = false,
                };
                _db.Payments.Add(payment);

                await _db.SaveChangesAsync();
                return Success($"Online payment recorded. Net ₹{netCredited:F2} credited to wallet.", payment.Id, wallet.Balance ?? 0);
            }
        }

        public async Task<DriverFinanceResultViewModel> RequestWithdrawalAsync(WithdrawalRequestViewModel model)
        {
            if (string.IsNullOrWhiteSpace(model.DriverUserId) || model.Amount <= 0)
            {
                return Fail("DriverUserId and Amount are required.");
            }

            var wallet = await EnsureWalletAsync(model.DriverUserId);
            var balance = wallet.Balance ?? 0;
            if (balance < model.Amount)
            {
                return Fail("Insufficient wallet balance.");
            }

            var driver = await _db.Drivers.FirstOrDefaultAsync(x => x.UserId == model.DriverUserId && x.IsDeleted != true);
            if (driver != null && !string.IsNullOrWhiteSpace(driver.TransactionPIN))
            {
                if (string.IsNullOrWhiteSpace(model.TransactionPIN) || model.TransactionPIN != driver.TransactionPIN)
                {
                    return Fail("Invalid security PIN. Withdrawal denied.");
                }
            }

            var payment = new Payment
            {
                Id = Guid.NewGuid(),
                BookingId = null,
                Amount = model.Amount,
                PaymentMode = WithdrawalMode,
                PaymentStatus = "pending",
                TransactionReference = $"WITHDRAWAL_REQUEST|{DriverMarker(model.DriverUserId)}|NOTE:{model.Note}",
                PaidAt = DateTime.UtcNow,
                IsDeleted = false,
            };

            _db.Payments.Add(payment);

            // Deduct balance immediately upon request submission
            wallet.Balance = balance - model.Amount;
            wallet.UpdatedAt = DateTime.UtcNow;
            _db.Wallets.Update(wallet);

            await _db.SaveChangesAsync();
            return Success("Withdrawal request submitted.", payment.Id, wallet.Balance ?? 0);
        }

        public async Task<DriverFinanceResultViewModel> ProcessWithdrawalAsync(WithdrawalActionViewModel model)
        {
            var action = model.Action?.Trim().ToLowerInvariant();
            if (action != "approve" && action != "reject")
            {
                return Fail("Action must be 'approve' or 'reject'.");
            }

            var payment = await _db.Payments.FirstOrDefaultAsync(x => x.Id == model.PaymentId && x.IsDeleted != true);
            if (payment == null || payment.PaymentMode != WithdrawalMode)
            {
                return Fail("Withdrawal request not found.");
            }
            if (payment.PaymentStatus != "pending")
            {
                return Fail("Withdrawal request already processed.");
            }

            var userId = ExtractDriverUserId(payment.TransactionReference);
            if (string.IsNullOrWhiteSpace(userId))
            {
                return Fail("Unable to resolve driver user id from withdrawal request.");
            }

            var wallet = await EnsureWalletAsync(userId);
            var balance = wallet.Balance ?? 0;

            if (action == "approve")
            {
                payment.PaymentStatus = "approved";
            }
            else
            {
                var amount = payment.Amount ?? 0;
                wallet.Balance = balance + amount;
                wallet.UpdatedAt = DateTime.UtcNow;
                _db.Wallets.Update(wallet);
                payment.PaymentStatus = "rejected";
            }

            payment.PaidAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Success($"Withdrawal {payment.PaymentStatus}.", payment.Id, wallet.Balance ?? 0);
        }
        
        public async Task<AccountStatementViewModel> GetAccountStatementAsync(string driverUserId)
        {
            var summary = await GetWalletSummaryAsync(driverUserId);
            var statement = new AccountStatementViewModel
            {
                DriverUserId = driverUserId,
                TotalEarnings = summary.TotalEarnings,
                CurrentBalance = summary.CurrentBalance
            };

            var marker = DriverMarker(driverUserId);
            var payments = await _db.Payments
                .Where(x => x.IsDeleted != true && x.TransactionReference != null && x.TransactionReference.Contains(marker))
                .OrderByDescending(x => x.PaidAt)
                .ToListAsync();

            foreach (var p in payments)
            {
                var isCashCommission = p.PaymentMode == CashCommissionMode;
                var isWithdrawal = p.PaymentMode == WithdrawalMode;
                var type = (isWithdrawal || isCashCommission) ? "Debit" : "Credit";

                string description;
                if (isCashCommission)
                {
                    description = "Commission deduction for previous ride (Cash Payment)";
                }
                else if (isWithdrawal)
                {
                    description = "Withdrawal";
                }
                else
                {
                    description = "Ride Payment (UPI/QR)";
                }

                // Extract ride info or notes if possible
                if (p.TransactionReference != null)
                {
                    var parts = p.TransactionReference.Split('|');
                    var ridePart = parts.FirstOrDefault(x => x.StartsWith("RIDE:"));
                    if (ridePart != null)
                    {
                        var rideIdStr = ridePart.Substring(5);
                        if (isCashCommission)
                        {
                            description = $"Commission deduction for Ride #{rideIdStr} (Cash Payment)";
                        }
                        else if (!isWithdrawal)
                        {
                            description = $"Ride Payment - Ride #{rideIdStr} (UPI/QR)";
                        }
                    }

                    var notePart = parts.FirstOrDefault(x => x.StartsWith("NOTE:"));
                    if (notePart != null) description += $" - {notePart.Substring(5)}";
                }

                statement.Transactions.Add(new AccountStatementItemViewModel
                {
                    Id = p.Id,
                    Date = p.PaidAt,
                    Description = description,
                    Amount = p.Amount ?? 0,
                    Type = type,
                    Status = p.PaymentStatus,
                    Reference = p.TransactionReference
                });
            }

            return statement;
        }

        private async Task<Wallet> EnsureWalletAsync(string userId)
        {
            var wallet = await _db.Wallets.FirstOrDefaultAsync(x => x.UserId == userId);
            if (wallet != null)
            {
                return wallet;
            }

            wallet = new Wallet
            {
                UserId = userId,
                Balance = 0,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.Wallets.Add(wallet);
            await _db.SaveChangesAsync();
            return wallet;
        }

        private static string DriverMarker(string userId) => $"DRIVER_USER:{userId}";

        private static string? ExtractDriverUserId(string? transactionReference)
        {
            if (string.IsNullOrWhiteSpace(transactionReference))
            {
                return null;
            }

            var parts = transactionReference.Split('|', StringSplitOptions.RemoveEmptyEntries);
            var marker = parts.FirstOrDefault(x => x.StartsWith("DRIVER_USER:", StringComparison.OrdinalIgnoreCase));
            if (string.IsNullOrWhiteSpace(marker))
            {
                return null;
            }
            return marker.Substring("DRIVER_USER:".Length);
        }

        public async Task<DriverFinanceResultViewModel> SetTransactionPinAsync(string driverUserId, string pin)
        {
            if (string.IsNullOrWhiteSpace(driverUserId) || string.IsNullOrWhiteSpace(pin) || pin.Length < 4)
            {
                return Fail("Invalid driver user or PIN length.");
            }

            var driver = await _db.Drivers.FirstOrDefaultAsync(x => x.UserId == driverUserId && x.IsDeleted != true);
            if (driver == null)
            {
                return Fail("Driver record not found.");
            }

            driver.TransactionPIN = pin;
            await _db.SaveChangesAsync();

            return Success("Transaction PIN updated successfully.", null, 0);
        }

        private static DriverFinanceResultViewModel Fail(string message) => new()
        {
            Success = false,
            Message = message,
        };

        private static DriverFinanceResultViewModel Success(string message, Guid? paymentId, decimal updatedBalance) => new()
        {
            Success = true,
            Message = message,
            PaymentId = paymentId,
            UpdatedBalance = updatedBalance,
        };
    }
}

