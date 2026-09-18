using System;
using System.Collections.Generic;

namespace WebAPI1.Models;

public partial class improve_type_tb
{
    public int? id { get; set; }

    public string? improve_typ { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public int? created_by { get; set; }

    public int? updated_by { get; set; }
}
