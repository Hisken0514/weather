namespace test.Dtos;

public class JsonRespon<T>
{   
    public T Data { get; set; }
    public string Message  { get; set; } = string.Empty;
    public bool IsSuccess { get; set; }
    
    // 成功時呼叫
    public static JsonRespon<T> Success(T data, string message = "成功")
    {
        return new JsonRespon<T>
        {
            Data = data,
            IsSuccess = true,
            Message = message
        };
    }

    // 失敗或找不到資料時呼叫
    public static JsonRespon<T> Fail(string message)
    {
        return new JsonRespon<T>
        {
            Data = default,
            IsSuccess = false,
            Message = message
        };
    }
}