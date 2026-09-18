using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace WebAPI1.Entities;

public enum Auth : byte // 使用 byte 節省空間
{
    員工 = 0,        // 只能檢視自己工廠的資訊
    工廠主管 = 1,    // 可上傳資料，僅限所屬工廠
    公司主管 = 2,    // 可上傳資料，並檢視旗下所有工廠
    政府監管者 = 3,  // 政府單位，可檢視所有公司與工廠
    審查委員 = 4     // 只能檢視督導廠商的建議內容
}
public class UserInfoName
{
    [Key]
    public int Id { get; set; }
    [Column("username", TypeName = "nvarchar(25)")]
    public string Username { get; set; }
    
    [Column("email", TypeName = "varchar(max)")]
    public string Email { get; set; }
    
    [Column("password", TypeName = "nvarchar(max)")]
    public string Password { get; set; }

    public int? EnterpriseId { get; set; }
    public int? CompanyId { get; set; }
    public int? FactoryId { get; set; }

    [Column(TypeName = "tinyint")] // 權限
    public Auth Auth { get; set; }
    
    [Column("mobile", TypeName = "varchar(40)")]
    public string? Mobile { get; set; }
    
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdateAt { get; set; }
    

}