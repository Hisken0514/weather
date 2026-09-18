using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace WebAPI1.Entities;

public class MenuRole
{
    [Key]
    public int Id { get; set; }
    
    [StringLength(50)]
    public string RoleName { get; set; }
    
    public int? MenuId { get; set; }

    [ForeignKey("MenuId")]
    public virtual Menu? Menu { get; set; }
}