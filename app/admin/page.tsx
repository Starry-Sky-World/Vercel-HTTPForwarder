"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Key, Shield, Eye, EyeOff, RefreshCw } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

export default function AdminPage() {
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [testUrl, setTestUrl] = useState("https://jsonplaceholder.typicode.com/posts/1")
  const [testResponse, setTestResponse] = useState("")
  const [testing, setTesting] = useState(false)

  // 生成随机API密钥
  const generateApiKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let result = ""
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setApiKey(result)
  }

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // 测试API密钥
  const testApiKey = async () => {
    if (!apiKey || !testUrl) return

    setTesting(true)
    setTestResponse("")

    try {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(testUrl)}&key=${encodeURIComponent(apiKey)}`
      const response = await fetch(proxyUrl)
      const responseText = await response.text()

      try {
        const jsonResponse = JSON.parse(responseText)
        setTestResponse(JSON.stringify(jsonResponse, null, 2))
      } catch {
        setTestResponse(responseText)
      }
    } catch (error) {
      setTestResponse(
        JSON.stringify(
          {
            error: "测试失败",
            details: error instanceof Error ? error.message : "未知错误",
          },
          null,
          2,
        ),
      )
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    // 页面加载时生成一个默认的API密钥
    generateApiKey()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
            <h1 className="text-4xl font-bold text-gray-900">代理服务管理</h1>
          </div>
          <p className="text-lg text-gray-600">配置API密钥以保护您的代理服务</p>
        </div>

        <Tabs defaultValue="setup" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">密钥设置</TabsTrigger>
            <TabsTrigger value="test">测试验证</TabsTrigger>
            <TabsTrigger value="usage">使用说明</TabsTrigger>
          </TabsList>

          <TabsContent value="setup">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  API密钥配置
                </CardTitle>
                <CardDescription>生成并配置您的API密钥以保护代理服务</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">API密钥</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="输入或生成API密钥..."
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-8 w-8 p-0"
                        onClick={() => setShowKey(!showKey)}
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <Button type="button" variant="outline" onClick={generateApiKey}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      生成
                    </Button>
                    <Button type="button" variant="outline" onClick={() => copyToClipboard(apiKey)} disabled={!apiKey}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">环境变量配置</h3>
                  <p className="text-sm text-blue-800 mb-3">将以下环境变量添加到您的Vercel项目中：</p>
                  <div className="bg-white p-3 rounded border font-mono text-sm">
                    <div className="flex items-center justify-between">
                      <span>PROXY_API_KEY={apiKey || "YOUR_API_KEY"}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(`PROXY_API_KEY=${apiKey}`)}
                        disabled={!apiKey}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    在Vercel Dashboard → Settings → Environment Variables 中添加此变量
                  </p>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-amber-900 mb-2">⚠️ 重要提醒</h3>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• 请妥善保管您的API密钥，不要泄露给他人</li>
                    <li>• 设置环境变量后需要重新部署项目才能生效</li>
                    <li>• 如果不设置环境变量，代理服务将对所有人开放</li>
                    <li>• 建议定期更换API密钥以提高安全性</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle>测试API密钥</CardTitle>
                <CardDescription>验证您的API密钥是否正确配置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">测试URL</label>
                  <Input
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    placeholder="输入要测试的URL..."
                  />
                </div>

                <Button onClick={testApiKey} disabled={testing || !apiKey || !testUrl} className="w-full">
                  {testing ? "测试中..." : "测试API密钥"}
                </Button>

                {testResponse && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">测试结果</label>
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2 z-10"
                        onClick={() => copyToClipboard(testResponse)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Textarea value={testResponse} readOnly rows={10} className="font-mono text-sm" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage">
            <Card>
              <CardHeader>
                <CardTitle>使用说明</CardTitle>
                <CardDescription>了解如何在请求中使用API密钥</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">认证方式</h3>
                  <div className="space-y-3">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        URL参数
                      </Badge>
                      <code className="block bg-gray-100 p-2 rounded text-sm">
                        /api/proxy?url=https://api.example.com&key={apiKey || "YOUR_API_KEY"}
                      </code>
                    </div>

                    <div>
                      <Badge variant="outline" className="mb-2">
                        请求头 - X-API-Key
                      </Badge>
                      <code className="block bg-gray-100 p-2 rounded text-sm">
                        X-API-Key: {apiKey || "YOUR_API_KEY"}
                      </code>
                    </div>

                    <div>
                      <Badge variant="outline" className="mb-2">
                        请求头 - Authorization Bearer
                      </Badge>
                      <code className="block bg-gray-100 p-2 rounded text-sm">
                        Authorization: Bearer {apiKey || "YOUR_API_KEY"}
                      </code>
                    </div>

                    <div>
                      <Badge variant="outline" className="mb-2">
                        请求头 - Authorization ApiKey
                      </Badge>
                      <code className="block bg-gray-100 p-2 rounded text-sm">
                        Authorization: ApiKey {apiKey || "YOUR_API_KEY"}
                      </code>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">cURL示例</h3>
                  <div className="bg-gray-100 p-3 rounded">
                    <code className="text-sm">
                      {`curl -X GET "https://your-domain.vercel.app/api/proxy?url=https://api.example.com&key=${
                        apiKey || "YOUR_API_KEY"
                      }"`}
                    </code>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">JavaScript示例</h3>
                  <div className="bg-gray-100 p-3 rounded">
                    <code className="text-sm whitespace-pre-wrap">
                      {`fetch('/api/proxy?url=' + encodeURIComponent('https://api.example.com'), {
  headers: {
    'X-API-Key': '${apiKey || "YOUR_API_KEY"}'
  }
})`}
                    </code>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">✅ 安全提示</h3>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• 推荐使用请求头方式传递API密钥，避免在URL中暴露</li>
                    <li>• 在生产环境中使用HTTPS确保传输安全</li>
                    <li>• 定期轮换API密钥</li>
                    <li>• 监控API使用情况，及时发现异常</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
