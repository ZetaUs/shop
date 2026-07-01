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
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      // 全局调试接口
      if (path === "/api/debug") {
        let goodsAllKeys = [];
        let cursor = null;
        do {
          const page = await GoodShop.list({ prefix: "goods_", cursor });
          goodsAllKeys = goodsAllKeys.concat(page.keys);
          cursor = page.list_complete ? null : page.cursor;
        } while (cursor);

        let shopAllKeys = [];
        cursor = null;
        // 门店KV匹配 goods_ 前缀
        do {
          const page = await Shop.list({ prefix: "goods_", cursor });
          shopAllKeys = shopAllKeys.concat(page.keys);
          cursor = page.list_complete ? null : page.cursor;
        } while (cursor);

        return Response.json({
          envBindings: Object.keys(env),
          goodsKeyTotal: goodsAllKeys.length,
          shopKeyTotal: shopAllKeys.length,
          shopRawKeys: shopAllKeys.map(item => item.name)
        }, { headers: CORS_HEADERS });
      }

      // 单独测试Shop读取
      if (path === "/api/test-shop") {
        await Shop.put("goods_shop_test", JSON.stringify({ id: "test1", name: "测试门店" }));
        const listRes = await Shop.list({ prefix: "goods_" });
        const testData = await Shop.get("goods_shop_test", "json");
        return Response.json({
          allShopKeys: listRes.keys.map(k => k.name),
          testShopData: testData
        }, { headers: CORS_HEADERS });
      }

      // ========== 商品接口（不变，goods_前缀） ==========
      if (path === "/api/goods" && request.method === "GET") {
        let goodsList = [];
        let cursor = null;
        do {
          const kvPage = await GoodShop.list({ prefix: "goods_", cursor });
          for (const item of kvPage.keys) {
            try {
              const goods = await GoodShop.get(item.name, "json");
              if (goods) goodsList.push(goods);
            } catch (e) {
              console.warn("商品解析失败", item.name, e);
            }
          }
          cursor = kvPage.list_complete ? null : kvPage.cursor;
        } while (cursor);
        return Response.json(goodsList, { headers: CORS_HEADERS });
      }

      if (/^\/api\/goods\/\w+$/.test(path) && request.method === "GET") {
        const goodsId = path.split("/").pop();
        const goods = await GoodShop.get(`goods_${goodsId}`, "json");
        if (goods) {
          return Response.json({ code: 200, msg: "查询成功", data: goods }, { headers: CORS_HEADERS });
        } else {
          return Response.json({ code: 404, msg: "该商品不存在" }, { status: 404, headers: CORS_HEADERS });
        }
      }

      if (path === "/api/goods/save" && request.method === "POST") {
        const body = await request.json();
        await GoodShop.put(`goods_${body.id}`, JSON.stringify(body));
        return Response.json({ code: 200, msg: "商品保存完成" }, { headers: CORS_HEADERS });
      }

      if (path === "/api/goods/del" && request.method === "POST") {
        const { id } = await request.json();
        await GoodShop.delete(`goods_${id}`);
        return Response.json({ code: 200, msg: "商品已删除" }, { headers: CORS_HEADERS });
      }

      // ========== 门店接口【已修改前缀为 goods_，匹配 goods_shop*】 ==========
      if (path === "/api/shop" && request.method === "GET") {
        let shopList = [];
        let cursor = null;
        do {
          // 修改点：prefix改为 goods_，匹配 Shop 库内 goods_shop01/02/03
          const kvPage = await Shop.list({ prefix: "goods_", cursor });
          for (const item of kvPage.keys) {
            try {
              const shop = await Shop.get(item.name, "json");
              if (shop) shopList.push(shop);
            } catch (e) {
              console.warn("门店数据解析失败", item.name, e);
            }
          }
          cursor = kvPage.list_complete ? null : kvPage.cursor;
        } while (cursor);
        return Response.json(shopList, { headers: CORS_HEADERS });
      }

      // 单门店查询（适配goods_shopxxx格式key）
      if (/^\/api\/shop\/\w+$/.test(path) && request.method === "GET") {
        const shopId = path.split("/").pop();
        const shop = await Shop.get(`goods_shop${shopId}`, "json");
        if (shop) {
          return Response.json({ code: 200, msg: "门店查询成功", data: shop }, { headers: CORS_HEADERS });
        } else {
          return Response.json({ code: 404, msg: "该门店不存在" }, { status: 404, headers: CORS_HEADERS });
        }
      }

      // 保存门店（写入key为 goods_shop{id}）
      if (path === "/api/shop/save" && request.method === "POST") {
        const body = await request.json();
        const key = `goods_shop${body.id}`;
        await Shop.put(key, JSON.stringify(body));
        return Response.json({ code: 200, msg: "门店保存完成" }, { headers: CORS_HEADERS });
      }

      // 删除门店
      if (path === "/api/shop/del" && request.method === "POST") {
        const { id } = await request.json();
        const key = `goods_shop${id}`;
        await Shop.delete(key);
        return Response.json({ code: 200, msg: "门店已删除" }, { headers: CORS_HEADERS });
      }

      return Response.json({ code: 404, msg: "接口不存在" }, { status: 404, headers: CORS_HEADERS });
    } catch (err) {
      console.error("[全局错误]", err);
      return Response.json({ code: 500, msg: "服务器异常", errMsg: err.message }, { status: 500, headers: CORS_HEADERS });
    }
  }
};