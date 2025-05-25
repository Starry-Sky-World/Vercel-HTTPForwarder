import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get("url")

  if (!targetUrl) {
    return NextResponse.json({ error: "缺少URL参数" }, { status: 400 })
  }

  const diagnostics = {
    url: targetUrl,
    timestamp: new Date().toISOString(),
    tests: {} as Record<string, any>,
  }

  try {
    const parsedUrl = new URL(targetUrl)
    diagnostics.tests.urlParsing = {
      status: "成功",
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? "443" : "80"),
      pathname: parsedUrl.pathname,
    }

    // 测试1: HEAD请求测试基础连接
    try {
      const headStart = Date.now()
      const headResponse = await fetch(targetUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(10000),
      })
      diagnostics.tests.headRequest = {
        status: "成功",
        statusCode: headResponse.status,
        duration: `${Date.now() - headStart}ms`,
        headers: Object.fromEntries(headResponse.headers.entries()),
      }
    } catch (headError) {
      diagnostics.tests.headRequest = {
        status: "失败",
        error: headError instanceof Error ? headError.message : "未知错误",
      }
    }

    // 测试2: 简单GET请求
    try {
      const getStart = Date.now()
      const getResponse = await fetch(targetUrl, {
        method: "GET",
        signal: AbortSignal.timeout(15000),
        headers: {
          "User-Agent": "Vercel-Diagnostic-Tool/1.0",
        },
      })
      const responseText = await getResponse.text()
      diagnostics.tests.getRequest = {
        status: "成功",
        statusCode: getResponse.status,
        duration: `${Date.now() - getStart}ms`,
        responseSize: responseText.length,
        contentType: getResponse.headers.get("content-type"),
        responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? "..." : ""),
      }
    } catch (getError) {
      diagnostics.tests.getRequest = {
        status: "失败",
        error: getError instanceof Error ? getError.message : "未知错误",
      }
    }

    // 测试3: DNS解析测试（通过尝试连接不同路径）
    try {
      const dnsStart = Date.now()
      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`
      const dnsResponse = await fetch(baseUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      })
      diagnostics.tests.dnsResolution = {
        status: "成功",
        duration: `${Date.now() - dnsStart}ms`,
        baseUrlAccessible: true,
      }
    } catch (dnsError) {
      diagnostics.tests.dnsResolution = {
        status: "失败",
        error: dnsError instanceof Error ? dnsError.message : "未知错误",
        baseUrlAccessible: false,
      }
    }

    // 分析结果
    const analysis = []
    if (diagnostics.tests.headRequest?.status === "失败") {
      analysis.push("基础连接失败，可能是网络问题或服务器不可达")
    }
    if (diagnostics.tests.getRequest?.status === "失败") {
      analysis.push("GET请求失败，可能是服务器拒绝请求或超时")
    }
    if (diagnostics.tests.dnsResolution?.status === "失败") {
      analysis.push("DNS解析可能有问题")
    }
    if (analysis.length === 0) {
      analysis.push("所有测试都通过，网络连接正常")
    }

    diagnostics.analysis = analysis

    return NextResponse.json(diagnostics)
  } catch (error) {
    return NextResponse.json(
      {
        error: "诊断过程中发生错误",
        details: error instanceof Error ? error.message : "未知错误",
        url: targetUrl,
      },
      { status: 500 },
    )
  }
}
