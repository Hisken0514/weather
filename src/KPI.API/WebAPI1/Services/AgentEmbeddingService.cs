using SmartComponents.LocalEmbeddings;

namespace WebAPI1.Services;

/// <summary>
/// 自架本機 embedding，不透過 LiteLLM。原因：LiteLLM 這台 proxy 目前沒有任何一個
/// team 可用、且真的有健康部署的 embedding 模型（text-embedding-3-large 沒授權，
/// gemma4:26b 沒有 embedding 服務），在對方補上之前先用這個內建小模型頂著測。
///
/// 用 SmartComponents.LocalEmbeddings（微軟官方套件），模型檔案隨套件內附，
/// 完全離線運作，輸出 384 維向量——跟 AgentVectorStoreService 的 VECTOR(384) 對應。
///
/// 注意：內附模型主要是英文語料訓練，中文語意品質不如正規多語 embedding 模型，
/// 之後 LiteLLM 那邊補上 embedding 模型，建議切回去、並重新對所有文件跑一次
/// 「重新同步向量」（兩種模型的向量空間不相容，不能混用）。
/// </summary>
public interface IAgentEmbeddingService
{
    float[] Embed(string text);
}

public class AgentEmbeddingService : IAgentEmbeddingService, IDisposable
{
    private readonly LocalEmbedder _embedder = new();

    public float[] Embed(string text)
    {
        var embedding = _embedder.Embed(text, 512);
        return embedding.Values.ToArray();
    }

    public void Dispose() => _embedder.Dispose();
}
