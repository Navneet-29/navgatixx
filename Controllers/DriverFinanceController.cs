using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using satguruApp.Service.Services.Interfaces;
using satguruApp.Service.ViewModels;
using System.Threading.Tasks;

namespace navgatix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DriverFinanceController : ControllerBase
    {
        private readonly IDriverFinanceService _driverFinanceService;

        public DriverFinanceController(IDriverFinanceService driverFinanceService)
        {
            _driverFinanceService = driverFinanceService;
        }

        [HttpGet("wallet/{driverUserId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetWalletSummary(string driverUserId)
        {
            return Ok(await _driverFinanceService.GetWalletSummaryAsync(driverUserId));
        }

        [HttpPost("ridePayment")]
        [AllowAnonymous]
        public async Task<IActionResult> RecordRidePayment([FromBody] RidePaymentRequestViewModel model)
        {
            return Ok(await _driverFinanceService.RecordRidePaymentAsync(model));
        }

        [HttpPost("withdrawal/request")]
        [AllowAnonymous]
        public async Task<IActionResult> RequestWithdrawal([FromBody] WithdrawalRequestViewModel model)
        {
            return Ok(await _driverFinanceService.RequestWithdrawalAsync(model));
        }

        [HttpPost("withdrawal/process")]
        [AllowAnonymous]
        public async Task<IActionResult> ProcessWithdrawal([FromBody] WithdrawalActionViewModel model)
        {
            return Ok(await _driverFinanceService.ProcessWithdrawalAsync(model));
        }

        [HttpGet("statement/{driverUserId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetStatement(string driverUserId)
        {
            return Ok(await _driverFinanceService.GetAccountStatementAsync(driverUserId));
        }

        [HttpPost("wallet/setPin")]
        [AllowAnonymous]
        public async Task<IActionResult> SetTransactionPin([FromBody] SetPinRequestViewModel model)
        {
            return Ok(await _driverFinanceService.SetTransactionPinAsync(model.DriverUserId, model.PIN));
        }
    }
}
