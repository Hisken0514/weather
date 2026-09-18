using System;
using System.Collections.Generic;

namespace WebAPI1.Models;

public partial class township_info
{
    public int? id { get; set; }

    public string? township { get; set; }

    public int? city_id { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? update_at { get; set; }
}
