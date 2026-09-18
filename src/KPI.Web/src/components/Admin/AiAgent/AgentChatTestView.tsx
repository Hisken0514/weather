'use client'

import React from "react";
import AgentChatConversation, { AGENT_PRESET_QUESTIONS } from "@/components/AIChat/AgentChatConversation";

export default function AgentChatTestView() {
    return (
        <div className="bg-white rounded-xl border shadow-sm p-6 max-w-3xl space-y-4">
            <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-1">AI Agent 測試</h3>
                <p className="text-gray-500 text-sm">
                    直接呼叫 <code className="bg-gray-100 px-1 rounded">/api/agent/chat/stream</code>，
                    跟 AI 聊天測試（Gemini）是完全不同的一條路，測試文件 RAG 用。
                </p>
            </div>
            <div className="border rounded-lg h-96 overflow-hidden">
                <AgentChatConversation
                    emptyHint="輸入訊息開始測試，或直接點下面的範例問題"
                    presetQuestions={AGENT_PRESET_QUESTIONS}
                    forceShowToolCallDetails
                />
            </div>
        </div>
    );
}
