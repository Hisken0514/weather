import api from "@/utils/api";


export const FileService = {
    async DownloadFile(filePath: string, fileName: string) {
        try {
            const response = await api.get(`/Files/DownloadFile`, {
                params: { path: filePath }, // 修正：使用 params 传递查询参数
                responseType: 'blob',
                headers: {
                    'Accept': 'application/octet-stream',
                },
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(url);
        } catch (error) {

            throw error;
        }
    },
}