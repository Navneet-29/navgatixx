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
            if (driver != null)
            {
                // Configurable commission rate (can be changed later)
                const decimal CommissionRate = 0.10m;
                var todayUtc = DateTime.UtcNow.Date;
                summary.TotalEarnings = await _db.Bookings
                    .Where(x => x.DriverId == driver.Id && x.CT_BookingStatus == RideStatus.RideCompleted && x.IsDeleted != true && x.CreatedAt >= todayUtc)
                    .Select(x => (x.FinalFare ?? x.EstimatedFare ?? 0) * (1.0m - CommissionRate))
                    .SumAsync();
            }

            var marker = DriverMarker(driverUserId);
            summary.TotalRidePayments = await _db.Payments
                .Where(x => x.IsDeleted != true
                            && x.PaymentMode == RidePaymentMode
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

            var payment = new Payment
            {
                Id = Guid.NewGuid(),
                BookingId = null,
                Amount = model.Amount,
                PaymentMode = string.IsNullOrWhiteSpace(model.PaymentMode) ? RidePaymentMode : model.PaymentMode,
                PaymentStatus = "paid",
                TransactionReference = $"{(string.IsNullOrWhiteSpace(model.TransactionReference) ? $"RIDE:{model.RideId}" : model.TransactionReference)}|{DriverMarker(driver.UserId)}",
                PaidAt = DateTime.UtcNow,
                IsDeleted = false,
            };
            _db.Payments.Add(payment);

            var wallet = await EnsureWalletAsync(driver.UserId);
            var netCredited = model.Amount * 0.9m;
            wallet.Balance = (wallet.Balance ?? 0) + netCredited;
            wallet.UpdatedAt = DateTime.UtcNow;

            if (!ride.FinalFare.HasValue || ride.FinalFare.Value <= 0)
            {
                ride.FinalFare = model.Amount;
            }

            await _db.SaveChangesAsync();
            return Success("Ride payment recorded and wallet credited.", payment.Id, wallet.Balance ?? 0);
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
                var type = p.PaymentMode == WithdrawalMode ? "Debit" : "Credit";
                var description = p.PaymentMode == RidePaymentMode ? "Ride Payment" : 
                                 p.PaymentMode == WithdrawalMode ? "Withdrawal" : "Payment";
                
                // Extract ride info or notes if possible
                if (p.TransactionReference != null)
                {
                    var parts = p.TransactionReference.Split('|');
                    var ridePart = parts.FirstOrDefault(x => x.StartsWith("RIDE:"));
                    if (ridePart != null) description += $" (#{ridePart.Substring(5)})";
                    
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

