using System;
using System.Collections.Generic;

namespace WebAPI1.Models;

public partial class audit_cause
{
    public int? id { get; set; }

    public string? cause_name { get; set; }

    public string? cause_code { get; set; }
}
