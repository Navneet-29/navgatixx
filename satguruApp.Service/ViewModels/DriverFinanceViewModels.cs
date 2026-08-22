using System;
using System.Collections.Generic;

namespace satguruApp.Service.ViewModels
{
    public class DriverWalletSummaryViewModel
    {
        public string? DriverUserId { get; set; }
        public decimal TotalEarnings { get; set; }
        public decimal TotalRidePayments { get; set; }
        public decimal CurrentBalance { get; set; }
        public decimal PendingWithdrawalAmount { get; set; }
        public int PendingWithdrawalCount { get; set; }
        public bool HasTransactionPIN { get; set; }
    }

    public class RidePaymentRequestViewModel
    {
        public long RideId { get; set; }
        public decimal Amount { get; set; }
        public string? PaymentMode { get; set; }
        public string? TransactionReference { get; set; }
    }

    public class WithdrawalRequestViewModel
    {
        public string? DriverUserId { get; set; }
        public decimal Amount { get; set; }
        public string? Note { get; set; }
        public string? TransactionPIN { get; set; }
    }

    public class SetPinRequestViewModel
    {
        public string? DriverUserId { get; set; }
        public string? PIN { get; set; }
    }

    public class WithdrawalActionViewModel
    {
        public Guid PaymentId { get; set; }
        public string? Action { get; set; } // approve | reject
    }

    public class DriverFinanceResultViewModel
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public Guid? PaymentId { get; set; }
        public decimal? UpdatedBalance { get; set; }
    }

    public class AccountStatementViewModel
    {
        public string? DriverUserId { get; set; }
        public decimal TotalEarnings { get; set; }
        public decimal CurrentBalance { get; set; }
        public List<AccountStatementItemViewModel> Transactions { get; set; } = new();
    }

    public class AccountStatementItemViewModel
    {
        public Guid Id { get; set; }
        public DateTime? Date { get; set; }
        public string? Description { get; set; }
        public decimal Amount { get; set; }
        public string? Type { get; set; } // Credit | Debit
        public string? Status { get; set; }
        public string? Reference { get; set; }
    }
}
