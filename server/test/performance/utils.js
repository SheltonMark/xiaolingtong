import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, AUTH_TOKEN } from './config.js';

export function makeRequest(method, endpoint, payload = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (AUTH_TOKEN) {
    defaultHeaders['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }

  let response;
  if (method === 'GET') {
    response = http.get(url, { headers: defaultHeaders });
  } else if (method === 'POST') {
    response = http.post(url, JSON.stringify(payload), {
      headers: defaultHeaders,
    });
  } else if (method === 'PUT') {
    response = http.put(url, JSON.stringify(payload), {
      headers: defaultHeaders,
    });
  } else if (method === 'DELETE') {
    response = http.del(url, { headers: defaultHeaders });
  }

  return response;
}

export function checkResponse(response, expectedStatus = 200) {
  return check(response, {
    'status is correct': (r) => r.status === expectedStatus,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'response has data': (r) => r.body.length > 0,
  });
}

export function randomSleep(min = 1, max = 3) {
  sleep(Math.random() * (max - min) + min);
}
