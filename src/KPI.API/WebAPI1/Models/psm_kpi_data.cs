using System;
using System.Collections.Generic;

namespace WebAPI1.Models;

public partial class psm_kpi_data
{
    public int? id { get; set; }

    public int? company_id { get; set; }

    public int? factory_id { get; set; }

    public int? psm_kpi_tem { get; set; }

    public int? psm_kpi_rep { get; set; }

    public int? psm_kpi_sub { get; set; }

    public string? annual_aver { get; set; }

    public string? annual_aver1 { get; set; }

    public string? baseline { get; set; }

    public string? baseline_un { get; set; }

    public string? expressions { get; set; }

    public string? objective { get; set; }

    public string? objective_u { get; set; }

    public string? deviation { get; set; }

    public string? checkout_ti { get; set; }

    public string? checkout_ti1 { get; set; }

    public string? execution_o { get; set; }

    public string? number { get; set; }

    public string? conform { get; set; }

    public string? remark { get; set; }
}
