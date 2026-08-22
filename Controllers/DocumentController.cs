using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Configuration;
using satguruApp.Service.Services;
using satguruApp.Service.Services.Interfaces;
using satguruApp.Service.ViewModels;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Runtime.InteropServices.JavaScript;
using System.Threading.Tasks;

namespace navgatix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [RequestSizeLimit(long.MaxValue)]
    [RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue, ValueLengthLimit = int.MaxValue)]
    public class DocumentController : ControllerBase
    {
        private readonly IDocumentService _documentService;


        private readonly IConfiguration _configuration;
        private readonly ImageRepository _imageRepository;
        private readonly ISystemConfigurationService iSystemConfigurationBiz;
        // private readonly IImportPathRepository importPathRepository;
        string path, CDNFolder;
        string CDNAccount, CDNKey;
        //  private readonly ICommonTypeRepository _commonType;
        JSObject systemConfiguration;
        private readonly string _storageConnectionString;
        private readonly string _storageContainerName;
        private string subPath = @"~/uploaddocs/";
        public DocumentController(IDocumentService document
            , IConfiguration iConfig, ImageRepository img, ISystemConfigurationService SystemConfigurationBiz /*, IImportPathRepository _ImportPathRepository*/)
        {
            _documentService = document;
            _configuration = iConfig;
            _imageRepository = img;
            iSystemConfigurationBiz = SystemConfigurationBiz;
            //    iSystemConfigurationBiz.GetAppUserId = GetAppUserId;
            // systemConfiguration =  iSystemConfigurationBiz.GetConfigurationDetails<JSObject>("azureKey");
            //path = systemConfiguration["CDN3"].ToString();
            //CDNFolder = systemConfiguration["CDN3Folder"].ToString();
            //CDNAccount = systemConfiguration["CDN3Account"].ToString();
            //CDNKey = systemConfiguration["Accountkey"].ToString();
            // importPathRepository = _ImportPathRepository;
            _storageConnectionString = iConfig.GetValue<string>("AzureStorage:ConnectionString");
            _storageContainerName = iConfig.GetValue<string>("AzureStorage:ContainerName");
        }


        [HttpPost("list")]
        [AllowAnonymous]
        [ProducesResponseType(200, Type = typeof(List<DocumentViewModel>))]
        public IActionResult List([FromBody] DocumentViewModel filter)
        {
            if (filter.Id == 0)
            {
                var list = _documentService.GetDocumentList(filter);
                return Ok(list);
            }
            else
            {
                var list = _documentService.GetDocument(filter.Id, filter.DocumentName, filter.DocKey, filter.IsDeleted);
                return Ok(list);
            }
        }



        [HttpPost("upload")]
        [AllowAnonymous]
        [RequestSizeLimit(long.MaxValue)]
        [RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue, ValueLengthLimit = int.MaxValue)]
        [ProducesResponseType(201, Type = typeof(DocumentViewModel))]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> Upload([FromForm] DocumentViewModel documentDetailViewModel)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest("Errors:" + ModelState.ErrorCount.ToString() + " " + String.Join("\n", ModelState.Values.SelectMany(x => x.Errors).Select(x => x.ErrorMessage)));
            }
            try
            {

                if (documentDetailViewModel.File == null || documentDetailViewModel.File.Length == 0 || Request.Form.Files.Count == 0)
                    return BadRequest("File is required.");

                // Folder path: wwwroot/uploads/documents
                var uploadFolder = Path.Combine(Directory.GetCurrentDirectory(), subPath);

                if (!Directory.Exists(uploadFolder))
                    Directory.CreateDirectory(uploadFolder);

                if (Request.Form.Files.Count > 0)
                    documentDetailViewModel.File = Request.Form.Files[0];

                documentDetailViewModel.DocumentExt = Path.GetExtension(documentDetailViewModel.File.FileName);
                var uniqueFileName = $"{documentDetailViewModel.VehicleId}_{DateTime.Now.Ticks}_{documentDetailViewModel.File.FileName}";
                var filePath = Path.Combine(uploadFolder, uniqueFileName);

                // Save file
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await documentDetailViewModel.File.CopyToAsync(stream);
                }
                documentDetailViewModel.DocumentName = uniqueFileName;
                documentDetailViewModel.DocumentPath = filePath;

                documentDetailViewModel.DocumentExt = documentDetailViewModel.DocumentExt;
                documentDetailViewModel.DocStream = null;
                // Save the relative path in the DB so it can be served nicely via static files
                documentDetailViewModel.DocumentPath = $"/uploads/documents/{uniqueFileName}";
                await _documentService.SaveUpdateDocument(documentDetailViewModel);

                //var files = Request.Form.Files;
                //foreach (var item in files)
                //{
                //    var filename = ContentDispositionHeaderValue.Parse(item.ContentDisposition).FileName.Trim('"');
                //    filename = (filename == "blob") ? documentDetailViewModel.DocumentName : filename;
                //    using (var memoryStream = new MemoryStream())
                //    {
                //        await item.CopyToAsync(memoryStream);



                //        byte[] bytes = memoryStream.ToArray();
                //        string ext = item.ContentType;
                //        var documentName = await _imageRepository.UploadImage(documentDetailViewModel.CttableType, filename, bytes, "." + ext, CDNFolder, CDNAccount, CDNKey);



                //        //Do whatever you want with filename and its binaray data.
                //        documentDetailViewModel.DocumentName = filename;
                //        documentDetailViewModel.DocumentPath = path + documentName;
                //        documentDetailViewModel.DocumentExt = documentDetailViewModel.DocumentExt != null ? documentDetailViewModel.DocumentExt : filename.Split(".")[1];
                //        documentDetailViewModel.DocStream = null;
                //        await _documentService.SaveUpdateDocument(documentDetailViewModel);
                //    }
                //}
            }
            catch (Exception ex)
            {
            }
            return Ok(documentDetailViewModel);
        }

        [HttpPost("delete")]
        [ProducesResponseType(200, Type = typeof(DocumentViewModel))]
        public IActionResult Delete([FromBody] DocumentViewModel filter)
        {
            var list = _documentService.DeleteDocumentList(filter.Id, filter.IsDeleted);
            return Ok(list);
        }


        [HttpGet("getFile/{id}/{fileName}/{docKey}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetFile(int? id, string fileName, string docKey)
        {

            if (id == null) { return Ok("id is null"); }

            var provider = new FileExtensionContentTypeProvider();
            var document = _documentService.GetDocument(id.GetValueOrDefault(), fileName, docKey, false);

            var fullPath = Path.Combine(Directory.GetCurrentDirectory(), subPath, document.DocumentPath);
            if (!System.IO.File.Exists(fullPath))
                return NotFound();

            return PhysicalFile(fullPath, "application/octet-stream", document.DocumentName);

            //var stream = await

            //   // AppCache.GetorSetInCacheAsync<byte[]>(id.ToString() + fileName + docKey, () =>

            //   // {

            //         _imageRepository.DownloadFileAsync(_documentService.GetDocument(id.GetValueOrDefault(), fileName, docKey, false).DocumentPath, CDNFolder, CDNAccount, CDNKey);

            //    //});

            //string contentType;

            //if (!provider.TryGetContentType(fileName, out contentType))

            //{

            //    contentType = "application/octet-stream";

            //}

            //return File(stream, contentType, fileName);
            // return Ok();

        }


        [HttpGet("getBinaryData1")]
        [AllowAnonymous]
        public async Task<IActionResult> ConvertToBinary(string url)
        {

            var urlD = @"https://linky.blob.core.windows.net/docs/TOVHCL/202042/f2050149-e0f3-4a64-99a3-9a0503969933.PNG";

            var downloadUrl = @"E:/Images/logo.png";

            using (WebClient webClient = new WebClient())

            {

                webClient.DownloadFile(urlD, downloadUrl);

            }

            return Ok(downloadUrl);

        }

        [HttpPost("getBinaryData")]

        [ProducesResponseType(200, Type = typeof(DocumentViewModel))]
        public async Task<IActionResult> GetDownloadableFile([FromBody] DocumentViewModel documentModel)

        {

            documentModel.DocumentName = _documentService.GetDocument(documentModel.Id, documentModel.DocumentName, "", documentModel.IsDeleted).DocumentName;

            //var stream = await _imageRepository.DownloadFileAsync(documentModel.DocumentPath, CDNFolder, CDNAccount, CDNKey); ;

            //string contentType;

            //var provider = new FileExtensionContentTypeProvider();

            //if (!provider.TryGetContentType(documentModel.DocumentName, out contentType))

            //{

            //    contentType = "application/octet-stream";

            //}

            //var fDta = File(stream, contentType, documentModel.DocumentName);

            //  return fDta;
            return Ok();

        }

        [HttpPost("setDefaultDocument")]

        [AllowAnonymous]

        [ProducesResponseType(200, Type = typeof(List<DocumentViewModel>))]

        public IActionResult SetDefaultDocument([FromBody] DocumentViewModel filter)

        {

            var list = _documentService.SetDefaultDocument(filter);

            return Ok(list);

        }

        [HttpPost("uploadBytes")]

        [AllowAnonymous]

        [ProducesResponseType(201, Type = typeof(DocumentViewModel))]

        [ProducesResponseType(400)]

        [ProducesResponseType(403)]

        public async Task<IActionResult> UploadBytesData([FromBody] DocumentViewModel documentDetailViewModel)

        {

            if (!ModelState.IsValid)

            {

                return BadRequest("Errors:" + ModelState.ErrorCount.ToString() + " " + String.Join("\n", ModelState.Values.SelectMany(x => x.Errors).Select(x => x.ErrorMessage)));

            }

            try

            {

                // systemConfiguration = iSystemConfigurationBiz.GetCDNKeyConfigurationDetails();

                //var cdn3Account = systemConfiguration["CDN3Account"].ToString();

                //var cdn3 = systemConfiguration["CDN3"].ToString();

                //var cdnKey = systemConfiguration["Accountkey"].ToString();

                //var cdn3Folder = systemConfiguration["CDN3Folder"].ToString();

                var provider = new FileExtensionContentTypeProvider();

                string contentType;

                if (!provider.TryGetContentType(documentDetailViewModel.DocumentName, out contentType))

                {

                    contentType = "application/octet-stream";

                }

                //  var documentName = await _imageRepository.UploadImage(documentDetailViewModel.CttableType, documentDetailViewModel.DocumentName, documentDetailViewModel.DocStream, contentType, cdn3Folder, cdn3Account, cdnKey);


                //var blobServiceClient = new BlobServiceClient(_storageConnectionString);
                //var containerClient = blobServiceClient.GetBlobContainerClient(_storageContainerName);
                //await containerClient.CreateIfNotExistsAsync(); // Ensure container exists

                //var blobClient = containerClient.GetBlobClient(documentDetailViewModel.DocumentName);

                //using (var stream = file.OpenReadStream())
                //{
                //    await blobClient.UploadAsync(stream, overwrite: true);
                //}

                //Do whatever you want with filename and its binaray data.

                documentDetailViewModel.DocumentName = documentDetailViewModel.DocumentName;

                documentDetailViewModel.DocumentPath = path + documentDetailViewModel.DocumentName;

                documentDetailViewModel.DocumentExt = documentDetailViewModel.DocumentName.Split(".")[1];

                await _documentService.SaveUpdateDocument(documentDetailViewModel);

            }

            catch (Exception)

            {

            }

            return Ok(documentDetailViewModel);

        }

        [HttpGet]

        [Route("logo/{id:int}/{fileName}/{type}/{createdDate}")]

        [AllowAnonymous]

        public async Task<byte[]> GetLogoDetails(int id, string fileName, string type, string createdDate)

        {

            string docKey = "";

            var provider = new FileExtensionContentTypeProvider();
            var bytes = Array.Empty<byte>();
            HttpResponseMessage stream = new HttpResponseMessage(HttpStatusCode.OK);
            //var stream = await

            //         _imageRepository.DownloadFileAsync(_documentService.GetDocument(id, fileName, docKey, false).DocumentPath, CDNFolder, CDNAccount, CDNKey);

            //string contentType;

            //if (!provider.TryGetContentType(fileName, out contentType))

            //{

            //    contentType = "application/octet-stream";

            //}

            return bytes;

        }
        [HttpGet]

        [Route("~/getAttachmentAsync/{id}/{fileName}/{type}/{createdDate}")]
        public async Task<HttpResponseMessage> GetAttachmentAsync(int id, string fileName, string type, string createdDate)

        {

            //byte[] bytes = await _imageRepository.DownloadFileAsync(_documentService.GetDocument(id, fileName, "", false).DocumentPath, CDNFolder, CDNAccount, CDNKey); ;

            HttpResponseMessage response = new HttpResponseMessage(HttpStatusCode.OK);

            //response.Content = new ByteArrayContent(bytes);

            //response.Content.Headers.Add("name", fileName);

            //response.Content.Headers.ContentLength = bytes.LongLength;

            ////Set the Content Disposition Header Value and FileName.

            //response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment");

            //response.Content.Headers.ContentDisposition.FileName = fileName;

            //var provider = new FileExtensionContentTypeProvider();

            //string contentType;

            //if (!provider.TryGetContentType(fileName, out contentType))

            //{

            //    contentType = "application/octet-stream";

            //}

            ////Set the File Content Type.

            //response.Content.Headers.ContentType = new MediaTypeHeaderValue(contentType);

            return response;

        }

        [HttpGet]

        [Route("~/company/logodark")]

        [AllowAnonymous]

        public async Task<IActionResult> GetAttachmentAsyncCompanyLogo()

        {

            int id = await iSystemConfigurationBiz.GetConfigurationDetails<int>("companyId");

            return await Getlogo(id, "", "logodark", "");

        }

        [HttpGet]

        [Route("~/company/logo")]

        [AllowAnonymous]

        public async Task<IActionResult> GetAttachmentAsyncCompanyLightLogo()
        {
            int id = await iSystemConfigurationBiz.GetConfigurationDetails<int>("companyId");
            return await Getlogo(id, "", "logo", "");
        }
        [HttpGet]

        [Route("~/logo/{id}/{fileName}/{type}/{createdDate}")]
        public async Task<IActionResult> Getlogo(int id, string fileName, string type, string createdDate)
        {
            // systemConfiguration = iSystemConfigurationBiz.GetConfigurationDetails<JSObject>("logo");
            //var cdn3Account = systemConfiguration["CDN3Account"].ToString();
            //var cdn3 = systemConfiguration["CDN3"].ToString();
            //var cdnKey = systemConfiguration["Accountkey"].ToString();
            //var cdn3Folder = systemConfiguration["CDN3Folder"].ToString();

            DocumentViewModel data = _documentService.GetLogo(id, type);

            string docKey = "";

            var provider = new FileExtensionContentTypeProvider();
            HttpResponseMessage response = new HttpResponseMessage(HttpStatusCode.OK);
            //var stream = await
            //         _imageRepository.DownloadFileAsync(_documentService.GetDocument(id, fileName, docKey, false).DocumentPath, CDNFolder, CDNAccount, CDNKey);
            //string contentType;
            //if (!provider.TryGetContentType(fileName, out contentType))
            //{
            //    contentType = "application/octet-stream";
            //}

            //return File(stream, contentType);
            return Ok();

        }

        [HttpPost]

        [Route("updateDocsItem")]

        public async Task<IActionResult> UpdateDocsItem(DocumentViewModel VMModel)
        {
            var result = _documentService.UpdateDocsItem(VMModel);
            return Ok(result);
        }





        [HttpGet]
        [AllowAnonymous]
        [Route("getall")]
        public async Task<ActionResult<List<DocumentViewModel>>> GetAll()
        {
            var documents = await _documentService.GetAllAsync();
            return Ok(documents);
        }

        [HttpGet("getById/{id}")]
        public async Task<ActionResult<DocumentViewModel>> GetById(int id)
        {
            var document = await _documentService.GetByIdAsync(id);
            if (document == null)
                return NotFound($"Document with ID {id} not found.");
            return Ok(document);
        }

        [HttpPost, DisableRequestSizeLimit]
        public async Task<ActionResult> Add(DocumentViewModel model)
        {
            if (model.File != null && model.File.Length > 0)
            {
                var uploads = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "documents");
                if (!Directory.Exists(uploads))
                    Directory.CreateDirectory(uploads);

                var filePath = Path.Combine(uploads, model.File.FileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await model.File.CopyToAsync(stream);
                }
                // Optional: Save file info to database, etc.
            }

            if (model.UploadFile == null || model.UploadFile.Length == 0)
                return BadRequest("File is required.");

            var success = await _documentService.AddAsync(model);
            if (success)
                return CreatedAtAction(nameof(GetById), new { id = model.Id }, model);

            return StatusCode(StatusCodes.Status500InternalServerError, "Error uploading document.");
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, [FromForm] DocumentViewModel model)
        {
            if (id != model.Id)
                return BadRequest("ID mismatch.");

            var success = await _documentService.UpdateAsync(model);
            if (success)
                return NoContent();

            return NotFound($"Document with ID {id} not found.");
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            var success = await _documentService.DeleteAsync(id);
            if (success)
                return NoContent();

            return NotFound($"Document with ID {id} not found or already deleted.");
        }
    }
}
