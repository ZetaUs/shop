const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};
export default {
  async fetch(request, env) {
    const GoodShop = env.GoodShop;
    const Shop = env.Shop;
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }
    try {
      // 调试接口，查看两个KV的key数量
      if (path === "/api/debug") {
        let goodsKeys = [];
        let shopKeys = [];
        let cursor = null;
        do {
          const page = await GoodShop.list({ prefix: "goods_", cursor });
          goodsKeys.push(...page.keys);
          cursor = page.list_complete ? null : page.cursor;
        } while (cursor);

        cursor = null;
        do {
          const page = await Shop.list({ prefix: "shop_", cursor });
          shopKeys.push(...page.keys);
          cursor = page.list_complete ? null : page.cursor;
        } while (cursor);

        return Response.json({
          bindings: Object.keys(env),
          goodsKeyCount: goodsKeys.length,
          shopKeyCount: shopKeys.length,
          goodsKeys: goodsKeys.map(i => i.name),
          shopKeys: shopKeys.map(i => i.name)
        }, { headers: CORS_HEADERS });
      }

      // 商品列表
      if (path === "/api/goods" && request.method === "GET") {
        let goodsList = [];
        let cursor = null;
        do {
          const kvPage = await GoodShop.list({ prefix: "goods_", cursor });
          for (const item of kvPage.keys) {
            try {
              const goods = await GoodShop.get(item.name, "json");
              if (goods) goodsList.push(goods);
            } catch (singleErr) {
              console.warn("单商品数据解析失败跳过", item.name, singleErr);
            }
          }
          cursor = kvPage.list_complete ? null : kvPage.cursor;
        } while (cursor);
        return Response.json(goodsList, { headers: CORS_HEADERS });
      }

      // 单个商品
      if (/^\/api\/goods\/\w+$/.test(path) && request.method === "GET") {
        const goodsId = path.split("/").pop();
        const goods = await GoodShop.get(`goods_${goodsId}`, "json");
        if (goods) {
          return Response.json({ code: 200, msg: "查询成功", data: goods }, { headers: CORS_HEADERS });
        } else {
          return Response.json({ code: 404, msg: "该商品不存在" }, { status: 404, headers: CORS_HEADERS });
        }
      }

      // 保存商品
      if (path === "/api/goods/save" && request.method === "POST") {
        const body = await request.json();
        await GoodShop.put(`goods_${body.id}`, JSON.stringify(body));
        return Response.json({ code: 200, msg: "商品保存完成" }, { headers: CORS_HEADERS });
      }

      // 删除商品
      if (path === "/api/goods/del" && request.method === "POST") {
        const { id } = await request.json();
        await GoodShop.delete(`goods_${id}`);
        return Response.json({ code: 200, msg: "商品已删除" }, { headers: CORS_HEADERS });
      }

      // 门店列表【修复分页丢失prefix bug】
      if (path === "/api/shop" && request.method === "GET") {
        let shopList = [];
        let cursor = null;
        do {
          // 每次分页查询强制带上 prefix: "shop_"，原代码缺失此处导致多页时丢失门店数据
          const kvPage = await Shop.list({ prefix: "shop_", cursor });
          for (const item of kvPage.keys) {
            try {
              const shop = await Shop.get(item.name, "json");
              if (shop) shopList.push(shop);
            } catch (singleErr) {
              console.warn("单门店数据解析失败跳过", item.name, singleErr);
            }
          }
          cursor = kvPage.list_complete ? null : kvPage.cursor;
        } while (cursor);
        return Response.json(shopList, { headers: CORS_HEADERS });
      }

      // 单个门店
      if (/^\/api\/shop\/\w+$/.test(path) && request.method === "GET") {
        const shopId = path.split("/").pop();
        const shop = await Shop.get(`shop_${shopId}`, "json");
        if (shop) {
          return Response.json({ code: 200, msg: "门店查询成功", data: shop }, { headers: CORS_HEADERS });
        } else {
          return Response.json({ code: 404, msg: "该门店不存在" }, { status: 404, headers: CORS_HEADERS });
        }
      }

      // 保存门店
      if (path === "/api/shop/save" && request.method === "POST") {
        const body = await request.json();
        await Shop.put(`shop_${body.id}`, JSON.stringify(body));
        return Response.json({ code: 200, msg: "门店保存完成" }, { headers: CORS_HEADERS });
      }

      // 删除门店
      if (path === "/api/shop/del" && request.method === "POST") {
        const { id } = await request.json();
        await Shop.delete(`shop_${id}`);
        return Response.json({ code: 200, msg: "门店已删除" }, { headers: CORS_HEADERS });
      }

      return Response.json({ code: 404, msg: "接口不存在" }, { status: 404, headers: CORS_HEADERS });
    } catch (err) {
      console.error("[ShopAPI Error]", err);
      return Response.json({ code: 500, msg: "服务器异常，请稍后重试", error: err.message }, { status: 500, headers: CORS_HEADERS });
    }
  }
};