using System;
using System.Collections.Generic;

namespace WebAPI1.Models;

public partial class audit_basic_info
{
    public int? id { get; set; }

    public string? uuid { get; set; }

    public int? factory_id { get; set; }

    public int? audit_type_ { get; set; }

    public int? audit_cause { get; set; }

    public string? disater_typ { get; set; }

    public string? disater_typ1 { get; set; }

    public DateTime? incident_da { get; set; }

    public string? incident_de { get; set; }

    public string? sd { get; set; }

    public string? penalty { get; set; }

    public string? penalty_det { get; set; }

    public string? improve_sta { get; set; }

    public string? situation { get; set; }

    public double? participate { get; set; }

    public double? improve_sta1 { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? update_at { get; set; }
}
