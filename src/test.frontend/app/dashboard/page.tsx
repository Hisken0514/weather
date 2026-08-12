import { Suspense } from "react"
import Weather from "@/composes/Weather"

export default function page(){
    return (
        <Suspense>
            <Weather />
        </Suspense>
    )
}
