namespace ISHAuditAPI.Services;

public class PublicDto
{
    /// <summary>
    /// 通用 API 回應格式
    /// </summary>
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public T? Data { get; set; }

        public ApiResponse() { }

        public ApiResponse(bool success, string? message = null, T? data = default)
        {
            Success = success;
            Message = message;
            Data = data;
        }
        
    }
    
}