using System;
using System.Collections.Generic;

namespace WebAPI1.Models;

public partial class psm_kpi_report
{
    public int? id { get; set; }

    public int? company_id { get; set; }

    public int? factory_id { get; set; }

    public int? kpi_report_ { get; set; }

    public DateTime? report_time { get; set; }

    public DateTime? created_tim { get; set; }

    public string? status { get; set; }
}
