class ApiRouter {
  constructor(notFoundHandler) {
    this.routes = [];
    this.notFoundHandler =
      typeof notFoundHandler === 'function'
        ? notFoundHandler
        : (req, res) => {
            const body = JSON.stringify({ error: 'Not found' });
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(body);
          };
  }

  add(method, path, handler) {
    if (typeof path === 'function') {
      handler = path;
      path = '*';
    }

    this.routes.push({
      method: String(method || 'ANY').toUpperCase(),
      path: this.normalizePath(path || '*'),
      handler,
    });

    return this;
  }

  use(path, handler) {
    return this.add('ANY', path, handler);
  }

  any(path, handler) {
    return this.add('ANY', path, handler);
  }

  get(path, handler) {
    return this.add('GET', path, handler);
  }

  post(path, handler) {
    return this.add('POST', path, handler);
  }

  put(path, handler) {
    return this.add('PUT', path, handler);
  }

  patch(path, handler) {
    return this.add('PATCH', path, handler);
  }

  delete(path, handler) {
    return this.add('DELETE', path, handler);
  }

  head(path, handler) {
    return this.add('HEAD', path, handler);
  }

  options(path, handler) {
    return this.add('OPTIONS', path, handler);
  }

  normalizePath(pathname) {
    if (pathname === '*') return '*';

    let value = String(pathname || '/').trim();
    if (!value) value = '/';
    if (!value.startsWith('/')) value = `/${value}`;
    return value.split('?')[0];
  }

  match(method, pathname) {
    const reqMethod = String(method || 'GET').toUpperCase();
    const targetPath = this.normalizePath(pathname || '/');

    let bestMatch = null;

    for (const route of this.routes) {
      if (route.method !== 'ANY' && route.method !== reqMethod) {
        continue;
      }

      const match = this.routeMatches(route.path, targetPath);
      if (!match) continue;

      if (!bestMatch || route.path.length > bestMatch.route.path.length) {
        bestMatch = { route, params: match.params };
      }
    }

    return bestMatch;
  }

  routeMatches(routePath, targetPath) {
    if (routePath === '*') {
      return { params: {} };
    }

    const routeParts = routePath.split('/').filter(Boolean);
    const targetParts = targetPath.split('/').filter(Boolean);
    const params = {};

    if (routePath.endsWith('*')) {
      const basePath = routePath.slice(0, -1);
      const baseParts = basePath.split('/').filter(Boolean);
      if (targetParts.length < baseParts.length) return null;

      for (let i = 0; i < baseParts.length; i += 1) {
        const routePart = baseParts[i];
        const targetPart = targetParts[i];

        if (routePart.startsWith(':')) {
          params[routePart.slice(1)] = targetPart;
        } else if (routePart !== targetPart) {
          return null;
        }
      }

      return { params };
    }

    if (routeParts.length !== targetParts.length) {
      return null;
    }

    for (let i = 0; i < routeParts.length; i += 1) {
      const routePart = routeParts[i];
      const targetPart = targetParts[i];

      if (routePart.startsWith(':')) {
        params[routePart.slice(1)] = targetPart;
      } else if (routePart !== targetPart) {
        return null;
      }
    }

    return { params };
  }

  handle(req, res) {
    const url = typeof req?.url === 'string' ? req.url : '/';
    const pathname = url.split('?')[0] || '/';
    const method = req?.method || 'GET';
    const match = this.match(method, pathname);

    if (!match) {
      return this.notFoundHandler(req, res);
    }

    const request = { ...req, params: match.params };
    return match.route.handler(request, res);
  }
}

module.exports = ApiRouter;
module.exports.default = ApiRouter;
