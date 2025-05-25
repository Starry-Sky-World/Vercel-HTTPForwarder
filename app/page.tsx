"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Send, Globe, Code, Key, Settings, Link } from "lucide-react"
import NextLink from "next/link"

export default function ProxyTester() {
  const [url, setUrl] = useState("")
  const [method, setMethod] = useState("GET")
  const [headers, setHeaders] = useState("")
  const [body, setBody] = useState("")
  const [response, setResponse] = useState("")
  const [loading, setLoading] = useState(false)
  const [responseStatus, setResponseStatus] = useState<number | null>(null)
  const [apiKey, setApiKey] = useState("")
  const [proxyType, setProxyType] = useState<"normal" | "get">("normal")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    setLoading(true)
    setResponse("")
    setResponseStatus(null)

    try {
      let proxyUrl: string
      let requestOptions: RequestInit

      if (proxyType === "get") {
        // 使用GET代理
        const params = new URLSearchParams()
        params.set("url", url)
        params.set("method", method)

        if (apiKey) {
          params.set("key", apiKey)
        }

        if (headers.trim()) {
          try {
            const customHeaders = JSON.parse(headers)
            params.set("headers", JSON.stringify(customHeaders))
          } catch {
            // 如果不是JSON格式，尝试解析为键值对格式
            const headerObj: Record<string, string> = {}
            const lines = headers.split("\n")
            lines.forEach((line) => {
              const [key, ...valueParts] = line.split(":")
              if (key && valueParts.length > 0) {
                headerObj[key.trim()] = valueParts.join(":").trim()
              }
            })
            if (Object.keys(headerObj).length > 0) {
              params.set("headers", JSON.stringify(headerObj))
            }
          }
        }

        if (["POST", "PUT", "PATCH"].includes(method) && body) {
          params.set("body", body)
        }

        proxyUrl = `/api/get_proxy?${params.toString()}`
        requestOptions = { method: "GET" }
      } else {
        // 使用普通代理
        proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`
        if (apiKey) {
          proxyUrl += `&key=${encodeURIComponent(apiKey)}`
        }

        const requestHeaders: Record<string, string> = {}

        // 如果有API密钥，也添加到请求头中（双重保险）
        if (apiKey) {
          requestHeaders["X-API-Key"] = apiKey
        }

        // 解析自定义请求头
        if (headers.trim()) {
          try {
            const customHeaders = JSON.parse(headers)
            Object.assign(requestHeaders, customHeaders)
          } catch {
            // 如果不是JSON格式，尝试解析为键值对格式
            const lines = headers.split("\n")
            lines.forEach((line) => {
              const [key, ...valueParts] = line.split(":")
              if (key && valueParts.length > 0) {
                requestHeaders[key.trim()] = valueParts.join(":").trim()
              }
            })
          }
        }

        // 如果没有设置Content-Type且有请求体，设置默认值
        if (["POST", "PUT", "PATCH"].includes(method) && body && !requestHeaders["Content-Type"]) {
          try {
            JSON.parse(body)
            requestHeaders["Content-Type"] = "application/json"
          } catch {
            requestHeaders["Content-Type"] = "text/plain"
          }
        }

        requestOptions = {
          method,
          headers: requestHeaders,
        }

        if (["POST", "PUT", "PATCH"].includes(method) && body) {
          requestOptions.body = body
        }
      }

      console.log("发送代理请求:", { url: proxyUrl, type: proxyType, method, options: requestOptions })

      const res = await fetch(proxyUrl, requestOptions)
      setResponseStatus(res.status)

      const responseText = await res.text()

      // 尝试格式化JSON响应
      try {
        const jsonResponse = JSON.parse(responseText)
        setResponse(JSON.stringify(jsonResponse, null, 2))
      } catch {
        setResponse(responseText)
      }

      if (!res.ok) {
        console.error("代理请求失败:", { status: res.status, response: responseText })

        // 如果是JSON错误响应，尝试解析并显示详细信息
        try {
          const errorData = JSON.parse(responseText)
          if (errorData.suggestions || errorData.troubleshooting) {
            // 格式化错误信息以便更好地显示
            const formattedError = {
              ...errorData,
              formattedSuggestions: errorData.suggestions?.join("\n• ") || "",
              formattedTroubleshooting: errorData.troubleshooting
                ? Object.entries(errorData.troubleshooting)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join("\n")
                : "",
            }
            setResponse(JSON.stringify(formattedError, null, 2))
            return
          }
        } catch {
          // 如果解析失败，继续使用原始响应
        }
      }
    } catch (error) {
      console.error("请求错误:", error)
      setResponseStatus(500)

      let errorMessage = "请求失败"
      if (error instanceof Error) {
        if (error.name === "TypeError" && error.message.includes("fetch")) {
          errorMessage = "网络连接失败，请检查网络连接或目标URL是否正确"
        } else {
          errorMessage = error.message
        }
      }

      setResponse(
        JSON.stringify(
          {
            error: errorMessage,
            timestamp: new Date().toISOString(),
            targetUrl: url,
            method: method,
            proxyType: proxyType,
          },
          null,
          2,
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const generateGetProxyUrl = () => {
    if (!url) return ""

    const params = new URLSearchParams()
    params.set("url", url)
    params.set("method", method)

    if (apiKey) {
      params.set("key", apiKey)
    }

    if (headers.trim()) {
      try {
        const customHeaders = JSON.parse(headers)
        params.set("headers", JSON.stringify(customHeaders))
      } catch {
        // 如果不是JSON格式，尝试解析为键值对格式
        const headerObj: Record<string, string> = {}
        const lines = headers.split("\n")
        lines.forEach((line) => {
          const [key, ...valueParts] = line.split(":")
          if (key && valueParts.length > 0) {
            headerObj[key.trim()] = valueParts.join(":").trim()
          }
        })
        if (Object.keys(headerObj).length > 0) {
          params.set("headers", JSON.stringify(headerObj))
        }
      }
    }

    if (["POST", "PUT", "PATCH"].includes(method) && body) {
      params.set("body", body)
    }

    return `${window.location.origin}/api/get_proxy?${params.toString()}`
  }

  const exampleUrls = [
    "https://jsonplaceholder.typicode.com/posts/1",
    "https://httpbin.org/get",
    "https://api.github.com/users/vercel",
    "https://httpbin.org/json",
    "https://reqres.in/api/users/1",
    "https://cat-fact.herokuapp.com/facts/random",
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Globe className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">HTTP 代理服务</h1>
          </div>
          <p className="text-lg text-gray-600">通过 Vercel 转发 HTTP 请求，解决跨域问题</p>
          <div className="mt-4">
            <NextLink href="/admin">
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                管理面板
              </Button>
            </NextLink>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* 请求配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                发送请求
              </CardTitle>
              <CardDescription>配置并发送HTTP请求通过代理服务器</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    API密钥 (可选)
                  </label>
                  <Input
                    type="password"
                    placeholder="如果服务器设置了API密钥，请在此输入..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">如果代理服务启用了认证，需要提供有效的API密钥</p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">代理类型</label>
                  <Select value={proxyType} onValueChange={(value: "normal" | "get") => setProxyType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">普通代理 (/api/proxy)</SelectItem>
                      <SelectItem value="get">GET代理 (/api/get_proxy)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {proxyType === "get"
                      ? "通过GET请求执行任何HTTP方法，所有参数通过URL传递"
                      : "标准代理模式，保持原始HTTP方法"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="输入目标URL..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">快速选择示例URL:</label>
                  <div className="flex flex-wrap gap-2">
                    {exampleUrls.map((exampleUrl, index) => (
                      <Button key={index} type="button" variant="outline" size="sm" onClick={() => setUrl(exampleUrl)}>
                        示例 {index + 1}
                      </Button>
                    ))}
                  </div>
                </div>

                <Tabs defaultValue="headers" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="headers">请求头</TabsTrigger>
                    <TabsTrigger value="body">请求体</TabsTrigger>
                  </TabsList>
                  <TabsContent value="headers" className="space-y-2">
                    <Textarea
                      placeholder={`输入请求头 (JSON格式或键值对格式):
{
  "Authorization": "Bearer token",
  "Content-Type": "application/json"
}

或者:
Authorization: Bearer token
Content-Type: application/json`}
                      value={headers}
                      onChange={(e) => setHeaders(e.target.value)}
                      rows={6}
                    />
                  </TabsContent>
                  <TabsContent value="body" className="space-y-2">
                    <Textarea
                      placeholder="输入请求体 (JSON, XML, 文本等)..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={6}
                      disabled={!["POST", "PUT", "PATCH"].includes(method)}
                    />
                  </TabsContent>
                </Tabs>

                {proxyType === "get" && url && (
                  <div>
                    <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      生成的GET代理URL
                    </label>
                    <div className="relative">
                      <Textarea value={generateGetProxyUrl()} readOnly rows={3} className="font-mono text-xs" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(generateGetProxyUrl())}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">您可以直接在浏览器中访问此URL或在其他应用中使用</p>
                  </div>
                )}

                <Button type="submit" disabled={loading || !url} className="w-full">
                  {loading ? "发送中..." : "发送请求"}
                </Button>

                {url && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      if (!url) return
                      setLoading(true)
                      try {
                        let diagnoseUrl = `/api/diagnose?url=${encodeURIComponent(url)}`
                        if (apiKey) {
                          diagnoseUrl += `&key=${encodeURIComponent(apiKey)}`
                        }
                        const res = await fetch(diagnoseUrl)
                        const diagnostics = await res.json()
                        setResponse(JSON.stringify(diagnostics, null, 2))
                        setResponseStatus(res.status)
                      } catch (error) {
                        setResponse(
                          JSON.stringify(
                            { error: "诊断失败", details: error instanceof Error ? error.message : "未知错误" },
                            null,
                            2,
                          ),
                        )
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                  >
                    🔍 网络诊断
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          {/* 响应结果 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                响应结果
                {responseStatus && (
                  <Badge variant={responseStatus < 400 ? "default" : "destructive"}>{responseStatus}</Badge>
                )}
                {proxyType === "get" && <Badge variant="outline">GET代理</Badge>}
              </CardTitle>
              <CardDescription>查看代理请求的响应内容</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {response && (
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 z-10"
                      onClick={() => copyToClipboard(response)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Textarea value={response} readOnly rows={15} className="font-mono text-sm" />
                  </div>
                )}
                {!response && !loading && (
                  <div className="text-center text-gray-500 py-8">发送请求后，响应内容将显示在这里</div>
                )}
                {loading && <div className="text-center text-gray-500 py-8">正在发送请求...</div>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 调试信息 */}
        {response && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>调试信息</CardTitle>
              <CardDescription>请求和响应的详细信息</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">请求信息:</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p>
                      <strong>代理类型:</strong> {proxyType === "get" ? "GET代理" : "普通代理"}
                    </p>
                    <p>
                      <strong>方法:</strong> {method}
                    </p>
                    <p>
                      <strong>目标URL:</strong> {url}
                    </p>
                    <p>
                      <strong>代理URL:</strong>{" "}
                      {proxyType === "get"
                        ? "/api/get_proxy?..."
                        : `/api/proxy?url=${encodeURIComponent(url)}${apiKey ? "&key=***" : ""}`}
                    </p>
                    <p>
                      <strong>API密钥:</strong> {apiKey ? "已设置" : "未设置"}
                    </p>
                    {headers && (
                      <p>
                        <strong>自定义请求头:</strong> 已设置
                      </p>
                    )}
                    {body && (
                      <p>
                        <strong>请求体:</strong> {body.length} 字符
                      </p>
                    )}
                  </div>
                </div>

                {responseStatus && (
                  <div>
                    <h4 className="font-semibold mb-2">响应信息:</h4>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <p>
                        <strong>状态码:</strong> {responseStatus}
                      </p>
                      <p>
                        <strong>响应长度:</strong> {response.length} 字符
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 使用说明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">API 端点:</h3>
              <div className="space-y-2">
                <code className="bg-gray-100 px-2 py-1 rounded text-sm block">/api/proxy?url=目标URL&key=API密钥</code>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm block">
                  /api/get_proxy?url=目标URL&method=POST&body=数据&key=API密钥
                </code>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">支持的HTTP方法:</h3>
              <div className="flex gap-2">
                {["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"].map((m) => (
                  <Badge key={m} variant="outline">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">功能特性:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>自动处理CORS跨域问题</li>
                <li>转发请求头和请求体</li>
                <li>支持所有常用HTTP方法</li>
                <li>保持原始响应状态码和头信息</li>
                <li>错误处理和日志记录</li>
                <li>🔒 API密钥认证保护</li>
                <li>🆕 GET代理模式 - 通过GET请求执行任何HTTP方法</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">GET代理使用示例:</h3>
              <div className="bg-gray-100 p-3 rounded">
                <code className="text-sm whitespace-pre-wrap">
                  {`# 通过GET请求发送POST数据
GET /api/get_proxy?url=https://api.example.com/data&method=POST&body={"key":"value"}&key=YOUR_API_KEY

# 通过GET请求发送带认证头的请求
GET /api/get_proxy?url=https://api.example.com&headers={"Authorization":"Bearer token"}&key=YOUR_API_KEY`}
                </code>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-amber-600">URL限制说明:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-amber-700 bg-amber-50 p-3 rounded">
                <li>只支持公网可访问的HTTP/HTTPS URL</li>
                <li>不支持本地地址 (localhost, 127.0.0.1)</li>
                <li>不支持私有IP地址 (192.168.x.x, 10.x.x.x等)</li>
                <li>不支持内网地址和.local域名</li>
                <li>只支持标准端口 (80, 443, 8080, 8443)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-green-600">🔒 安全功能:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-green-700 bg-green-50 p-3 rounded">
                <li>API密钥认证保护</li>
                <li>支持多种认证方式 (URL参数、请求头)</li>
                <li>环境变量安全存储</li>
                <li>请求日志和监控</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-blue-600">🆕 GET代理优势:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-700 bg-blue-50 p-3 rounded">
                <li>可以在浏览器地址栏直接访问</li>
                <li>方便在不支持复杂HTTP方法的环境中使用</li>
                <li>所有参数通过URL传递，便于调试和分享</li>
                <li>支持所有HTTP方法，包括POST、PUT、DELETE等</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
