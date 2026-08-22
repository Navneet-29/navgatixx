using satguruApp.Service.ViewModels;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace satguruApp.Service.Services.Interfaces
{
    public interface IDriverFinanceService
    {
        Task<DriverWalletSummaryViewModel> GetWalletSummaryAsync(string driverUserId);
        Task<DriverFinanceResultViewModel> RecordRidePaymentAsync(RidePaymentRequestViewModel model);
        Task<DriverFinanceResultViewModel> RequestWithdrawalAsync(WithdrawalRequestViewModel model);
        Task<DriverFinanceResultViewModel> ProcessWithdrawalAsync(WithdrawalActionViewModel model);
        Task<AccountStatementViewModel> GetAccountStatementAsync(string driverUserId);
        Task<DriverFinanceResultViewModel> SetTransactionPinAsync(string driverUserId, string pin);
    }
}
