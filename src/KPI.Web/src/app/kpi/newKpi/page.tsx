// import AddKPI from "@/components/KPI/AddKPI";
//
//
// export default function page(){
//
//     return (
//         <>
//         <AddKPI/>
//         </>
//     )
// }

import AddKpiPage from "@/components/KPI/AddKPI";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "新增績效指標" };

export default function page() {
    return <AddKpiPage />;
}