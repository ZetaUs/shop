export default {
  async fetch(request, env, ctx) {
    // 统一跨域头
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store, no-cache, must-revalidate"
    };

    // OPTIONS预检请求直接放行
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ========== 调试接口：排查KV空数据根源 ==========
      if (path === "/api/debug") {
        // 获取商品KV所有前缀key
        const goodsList = await env.GoodShop.list({ prefix: "goods_" });
        // 获取门店KV所有前缀key
        const shopList = await env.Shop.list({ prefix: "shop_" });

        return new Response(JSON.stringify({
          envBindings: Object.keys(env),
          goodsPrefixKeys: goodsList.keys.map(k => k.name),
          goodsTotal: goodsList.keys.length,
          shopPrefixKeys: shopList.keys.map(k => k.name),
          shopTotal: shopList.keys.length
        }, null, 2), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // ========== 商品接口 ==========
      // 获取全部商品列表
      if (path === "/api/goods" && request.method === "GET") {
        const { keys } = await env.GoodShop.list({ prefix: "goods_" });
        const goodsArr = [];

        for (const keyItem of keys) {
          const keyName = keyItem.name;
          try {
            // 读取JSON格式数据
            const data = await env.GoodShop.get(keyName, "json");
            if (data) goodsArr.push(data);
          } catch (parseErr) {
            // JSON解析失败，输出错误信息，不静默丢弃
            goodsArr.push({
              _error: `key:${keyName} JSON解析失败`,
              msg: parseErr.message
            });
          }
        }

        return new Response(JSON.stringify(goodsArr, null, 2), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 获取单个商品 /api/goods/123
      if (path.startsWith("/api/goods/") && request.method === "GET") {
        const id = path.split("/").pop();
        const key = `goods_${id}`;
        const data = await env.GoodShop.get(key, "json");

        if (!data) {
          return new Response(JSON.stringify({ code: 404, msg: "商品不存在" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify(data, null, 2), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 保存商品 POST /api/goods/save
      if (path === "/api/goods/save" && request.method === "POST") {
        const body = await request.json();
        const key = `goods_${body.id}`;
        await env.GoodShop.put(key, JSON.stringify(body));
        return new Response(JSON.stringify({ code: 200, msg: "保存成功" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 删除商品 POST /api/goods/del
      if (path === "/api/goods/del" && request.method === "POST") {
        const body = await request.json();
        const key = `goods_${body.id}`;
        await env.GoodShop.delete(key);
        return new Response(JSON.stringify({ code: 200, msg: "删除成功" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // ========== 门店接口 ==========
      // 获取全部门店列表
      if (path === "/api/shop" && request.method === "GET") {
        const { keys } = await env.Shop.list({ prefix: "shop_" });
        const shopArr = [];

        for (const keyItem of keys) {
          const keyName = keyItem.name;
          try {
            const data = await env.Shop.get(keyName, "json");
            if (data) shopArr.push(data);
          } catch (parseErr) {
            shopArr.push({
              _error: `key:${keyName} JSON解析失败`,
              msg: parseErr.message
            });
          }
        }

        return new Response(JSON.stringify(shopArr, null, 2), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 获取单个门店 /api/shop/123
      if (path.startsWith("/api/shop/") && request.method === "GET") {
        const id = path.split("/").pop();
        const key = `shop_${id}`;
        const data = await env.Shop.get(key, "json");

        if (!data) {
          return new Response(JSON.stringify({ code: 404, msg: "门店不存在" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify(data, null, 2), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 保存门店 POST /api/shop/save
      if (path === "/api/shop/save" && request.method === "POST") {
        const body = await request.json();
        const key = `shop_${body.id}`;
        await env.Shop.put(key, JSON.stringify(body));
        return new Response(JSON.stringify({ code: 200, msg: "保存成功" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 删除门店 POST /api/shop/del
      if (path === "/api/shop/del" && request.method === "POST") {
        const body = await request.json();
        const key = `shop_${body.id}`;
        await env.Shop.delete(key);
        return new Response(JSON.stringify({ code: 200, msg: "删除成功" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 未匹配路由
      return new Response(JSON.stringify({ code: 404, msg: "接口不存在" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (globalErr) {
      // 全局捕获所有异常，直接返回错误信息，不会空白/空数组
      return new Response(JSON.stringify({
        code: 500,
        msg: "服务异常",
        error: globalErr.message,
        stack: globalErr.stack
      }, null, 2), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};