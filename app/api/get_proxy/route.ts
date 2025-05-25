import { type NextRequest, NextResponse } from "next/server"

// 从环境变量获取API密钥
const API_KEY = process.env.PROXY_API_KEY

function validateApiKey(request: NextRequest): boolean {
  // 如果没有设置API密钥，则允许所有请求（向后兼容）
  if (!API_KEY) {
    return true
  }

  // 检查多种认证方式
  const authHeader = request.headers.get("authorization")
  const apiKeyHeader = request.headers.get("x-api-key")
  const { searchParams } = new URL(request.url)
  const apiKeyParam = searchParams.get("key") || searchParams.get("apikey") || searchParams.get("api_key")

  // 支持多种格式的API密钥验证
  const providedKey =
    apiKeyParam || // URL参数
    apiKeyHeader || // X-API-Key头
    (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null) || // Bearer token
    (authHeader?.startsWith("ApiKey ") ? authHeader.substring(7) : null) // ApiKey token

  return providedKey === API_KEY
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 验证API密钥
    if (!validateApiKey(request)) {
      return NextResponse.json(
        {
          error: "未授权访问",
          message: "需要有效的API密钥才能使用此服务",
          authMethods: [
            "URL参数: ?key=YOUR_API_KEY",
            "请求头: X-API-Key: YOUR_API_KEY",
            "Authorization: Bearer YOUR_API_KEY",
            "Authorization: ApiKey YOUR_API_KEY",
          ],
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      )
    }

    // 从查询参数中获取配置
    const { searchParams } = new URL(request.url)
    const targetUrl = searchParams.get("url")
    const method = (searchParams.get("method") || "GET").toUpperCase()
    const headersParam = searchParams.get("headers")
    const bodyParam = searchParams.get("body") || searchParams.get("data")

    if (!targetUrl) {
      return NextResponse.json(
        {
          error: "缺少目标URL参数",
          message: "请在查询参数中提供 ?url=目标地址",
          example: '/api/get_proxy?url=https://api.example.com&method=POST&body={"key":"value"}&key=YOUR_API_KEY',
          parameters: {
            url: "目标URL (必需)",
            method: "HTTP方法 (可选，默认GET)",
            headers: "请求头JSON字符串 (可选)",
            body: "请求体内容 (可选)",
            data: "请求体内容的别名 (可选)",
            key: "API密钥 (如果启用认证)",
          },
        },
        { status: 400 },
      )
    }

    // 验证HTTP方法
    const allowedMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
    if (!allowedMethods.includes(method)) {
      return NextResponse.json(
        {
          error: "不支持的HTTP方法",
          method: method,
          allowedMethods: allowedMethods,
          message: "请使用支持的HTTP方法",
        },
        { status: 400 },
      )
    }

    // 验证URL格式
    let parsedUrl: URL
    try {
      parsedUrl = new URL(targetUrl)
    } catch (urlError) {
      return NextResponse.json(
        {
          error: "无效的URL格式",
          providedUrl: targetUrl,
          message: "请提供有效的HTTP或HTTPS URL",
        },
        { status: 400 },
      )
    }

    // 安全检查：只允许HTTP和HTTPS协议
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        {
          error: "不支持的协议",
          protocol: parsedUrl.protocol,
          message: "只支持 HTTP 和 HTTPS 协议",
        },
        { status: 400 },
      )
    }

    // 检查是否为私有IP地址或本地地址
    const hostname = parsedUrl.hostname.toLowerCase()
    const isPrivateOrLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.2") ||
      hostname.startsWith("172.30.") ||
      hostname.startsWith("172.31.") ||
      hostname.startsWith("169.254.") ||
      hostname === "::1" ||
      hostname.includes(".local") ||
      !hostname.includes(".")

    if (isPrivateOrLocal) {
      return NextResponse.json(
        {
          error: "不支持的URL",
          hostname: hostname,
          message: "出于安全考虑，不支持访问本地地址、私有IP地址或内网地址。请使用公网可访问的URL。",
          suggestion: "请尝试使用公开的API，如 https://jsonplaceholder.typicode.com 或 https://httpbin.org",
        },
        { status: 400 },
      )
    }

    // 检查端口号
    if (parsedUrl.port && !["80", "443", "8080", "8443"].includes(parsedUrl.port)) {
      return NextResponse.json(
        {
          error: "不支持的端口",
          port: parsedUrl.port,
          message: "只支持标准HTTP端口 (80, 443, 8080, 8443)",
        },
        { status: 400 },
      )
    }

    console.log(`[GET Proxy] ${method} ${targetUrl} - API Key: ${API_KEY ? "验证通过" : "未设置"}`)

    // 准备转发的请求头
    const forwardHeaders: Record<string, string> = {}

    // 复制原始请求头，但排除一些不应该转发的头
    const excludeHeaders = [
      "host",
      "connection",
      "upgrade",
      "proxy-connection",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailers",
      "transfer-encoding",
      "content-length", // 让fetch自动计算
    ]

    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase()
      if (!excludeHeaders.includes(lowerKey)) {
        // 特殊处理认证相关的头
        if (lowerKey === "authorization" || lowerKey === "x-api-key") {
          // 只有当这个头不是用于代理认证时才转发
          const authHeader = request.headers.get("authorization")
          const apiKeyHeader = request.headers.get("x-api-key")
          const apiKeyParam = searchParams.get("key") || searchParams.get("apikey") || searchParams.get("api_key")

          // 如果这个Authorization头不是用于代理认证的，就转发它
          if (lowerKey === "authorization" && API_KEY) {
            const providedKey =
              apiKeyParam ||
              apiKeyHeader ||
              (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null) ||
              (authHeader?.startsWith("ApiKey ") ? authHeader.substring(7) : null)

            // 如果Authorization头不是用于代理认证，则转发
            if (authHeader && providedKey !== API_KEY) {
              forwardHeaders[key] = value
            }
          } else if (lowerKey === "x-api-key" && API_KEY) {
            // 如果X-API-Key不是用于代理认证，则转发
            if (apiKeyHeader && apiKeyHeader !== API_KEY) {
              forwardHeaders[key] = value
            }
          } else if (!API_KEY) {
            // 如果没有设置API密钥，直接转发所有头
            forwardHeaders[key] = value
          }
        } else {
          forwardHeaders[key] = value
        }
      }
    })

    // 解析自定义请求头
    if (headersParam) {
      try {
        const customHeaders = JSON.parse(headersParam)
        if (typeof customHeaders === "object" && customHeaders !== null) {
          Object.assign(forwardHeaders, customHeaders)
        }
      } catch (headerError) {
        return NextResponse.json(
          {
            error: "无效的请求头格式",
            headers: headersParam,
            message: "请求头必须是有效的JSON格式",
            example: '{"Authorization": "Bearer token", "Content-Type": "application/json"}',
          },
          { status: 400 },
        )
      }
    }

    // 设置用户代理
    forwardHeaders["User-Agent"] = "Vercel-GET-Proxy/1.0"

    // 准备请求选项
    const requestOptions: RequestInit = {
      method,
      headers: forwardHeaders,
      // 设置超时时间为25秒（Vercel函数超时前）
      signal: AbortSignal.timeout(25000),
    }

    // 处理请求体
    if (["POST", "PUT", "PATCH"].includes(method) && bodyParam) {
      try {
        // 尝试解析为JSON，如果失败则作为纯文本
        const processedBody = bodyParam
        try {
          // 检查是否是有效的JSON
          JSON.parse(bodyParam)
          // 如果没有设置Content-Type，设置为application/json
          if (!forwardHeaders["Content-Type"] && !forwardHeaders["content-type"]) {
            forwardHeaders["Content-Type"] = "application/json"
          }
        } catch {
          // 不是JSON，作为纯文本处理
          if (!forwardHeaders["Content-Type"] && !forwardHeaders["content-type"]) {
            forwardHeaders["Content-Type"] = "text/plain"
          }
        }
        requestOptions.body = processedBody
      } catch (bodyError) {
        return NextResponse.json(
          {
            error: "处理请求体失败",
            body: bodyParam,
            details: bodyError instanceof Error ? bodyError.message : "未知错误",
          },
          { status: 400 },
        )
      }
    }

    // 发送代理请求
    let response: Response
    try {
      response = await fetch(targetUrl, requestOptions)
    } catch (fetchError) {
      const duration = Date.now() - startTime
      console.error(`[GET Proxy Error] ${method} ${targetUrl} - ${duration}ms:`, fetchError)

      // 提供更详细的错误信息
      let errorMessage = "网络请求失败"
      let errorDetails = fetchError instanceof Error ? fetchError.message : "未知错误"
      let suggestions: string[] = []

      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          errorMessage = "请求超时"
          errorDetails = "请求超过25秒未响应"
          suggestions = ["目标服务器响应太慢", "尝试访问更快的API端点"]
        } else if (fetchError.message.includes("ENOTFOUND")) {
          errorMessage = "域名解析失败"
          errorDetails = "无法解析目标域名"
          suggestions = ["检查域名是否正确", "确认域名是否存在", "可能是DNS问题"]
        } else if (fetchError.message.includes("ECONNREFUSED")) {
          errorMessage = "连接被拒绝"
          errorDetails = "目标服务器拒绝连接"
          suggestions = ["服务器可能已关闭", "端口可能被阻止", "防火墙可能阻止了连接"]
        } else if (fetchError.message.includes("certificate") || fetchError.message.includes("SSL")) {
          errorMessage = "SSL证书错误"
          errorDetails = "目标网站的SSL证书有问题"
          suggestions = ["证书可能已过期", "证书可能不受信任", "尝试使用HTTP而非HTTPS"]
        } else if (fetchError.message === "fetch failed") {
          errorMessage = "网络请求失败"
          errorDetails = "通用网络错误，可能的原因包括："
          suggestions = [
            "目标服务器可能不存在或已关闭",
            "SSL/TLS握手失败",
            "网络连接问题",
            "目标API可能不允许来自Vercel的请求",
            "可能遇到了CORS或其他安全限制",
          ]
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: errorDetails,
          suggestions,
          targetUrl,
          method,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
          requestConfig: {
            url: targetUrl,
            method: method,
            headers: Object.keys(forwardHeaders),
            hasBody: !!bodyParam,
          },
        },
        { status: 502 },
      )
    }

    // 获取响应内容
    let responseText: string
    try {
      responseText = await response.text()
    } catch (responseError) {
      console.error("读取响应内容失败:", responseError)
      return NextResponse.json(
        {
          error: "读取响应内容失败",
          details: responseError instanceof Error ? responseError.message : "未知错误",
          status: response.status,
        },
        { status: 502 },
      )
    }

    // 准备响应头
    const responseHeaders = new Headers()

    // 复制响应头，但排除一些不应该转发的头
    const excludeResponseHeaders = [
      "connection",
      "upgrade",
      "proxy-connection",
      "transfer-encoding",
      "content-encoding", // 避免压缩问题
    ]

    response.headers.forEach((value, key) => {
      if (!excludeResponseHeaders.includes(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    })

    // 添加CORS头以支持跨域请求
    responseHeaders.set("Access-Control-Allow-Origin", "*")
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
    responseHeaders.set("Access-Control-Allow-Headers", "*")
    responseHeaders.set("Access-Control-Expose-Headers", "*")

    // 添加代理信息头
    responseHeaders.set("X-Proxy-Status", "success")
    responseHeaders.set("X-Proxy-Duration", `${Date.now() - startTime}ms`)
    responseHeaders.set("X-Proxy-Auth", API_KEY ? "required" : "disabled")
    responseHeaders.set("X-Proxy-Method", method)
    responseHeaders.set("X-Proxy-Type", "get_proxy")

    const duration = Date.now() - startTime
    console.log(`[GET Proxy Success] ${method} ${targetUrl} - ${response.status} - ${duration}ms`)

    // 返回代理响应
    return new NextResponse(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[GET Proxy Unexpected Error] - ${duration}ms:`, error)

    return NextResponse.json(
      {
        error: "GET代理服务内部错误",
        details: error instanceof Error ? error.message : "未知错误",
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// 处理OPTIONS请求（CORS预检）
export async function OPTIONS(request: NextRequest) {
  // OPTIONS请求也需要验证API密钥
  if (!validateApiKey(request)) {
    return NextResponse.json(
      {
        error: "未授权访问",
        message: "需要有效的API密钥才能使用此服务",
      },
      { status: 401 },
    )
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  })
}
