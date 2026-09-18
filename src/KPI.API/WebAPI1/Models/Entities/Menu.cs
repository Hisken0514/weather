using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace WebAPI1.Entities;

public enum IsActive : byte
{
    True = 0,
    False = 1,
}

public class Menu
{
    [Key]
    public int Id { get; set; }
    
    [StringLength(50)]
    public string Lable { get; set; }
    
    [StringLength(50)]
    public string Link { get; set; }
    
    [StringLength(50)]
    public string? Icon {get; set; }
    
    [Range(0, 10)]
    public int? ParentId { get; set; }
    
    public int SortOrder {get; set; }
    
    [Column(TypeName = "tinyint")] //是否啟用
    public int IsActive { get; set; }
    
    [StringLength(50)]
    public string MenuType { get; set; }
    
    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdateAt { get; set; }
    
    public virtual ICollection<MenuRole> MenuRoles { get; set; } = new List<MenuRole>();
}