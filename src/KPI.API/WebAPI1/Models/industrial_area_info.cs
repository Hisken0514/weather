using System;
using System.Collections.Generic;

namespace WebAPI1.Models;

public partial class industrial_area_info
{
    public int? id { get; set; }

    public string? industrial_ { get; set; }

    public int? township_id { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? update_at { get; set; }
}
