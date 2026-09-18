import React from "react";

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}
import {HomeIcon} from "@heroicons/react/24/outline";

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
    return (
        <div className="breadcrumbs text-sm">
            <div className="flex justify-between items-center">
                <a accessKey="C" href="#C" title="中央內容區塊"
                   className="bg-white text-white focus:text-base-content">
                    :::
                </a>
                <ul className="flex items-center space-x-2 pl-2">
                    <HomeIcon aria-hidden="true" className="size-4 text-gray-800"/>
                    {items.map((item, index) => (
                        <li key={index} className="flex items-center ml-2 text-gray-800">
                            <span aria-hidden="true" className="mx-2 text-gray-400">
                            &gt;
                          </span>
                            {item.href ? (
                                <a href={item.href} className="text-blue-500 hover:underline">
                                    {item.label}
                                </a>
                            ) : (
                                <span className="text-gray-500">{item.label}</span>
                            )}
                            {index < items.length - 1}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Breadcrumbs;
