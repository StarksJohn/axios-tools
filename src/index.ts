import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse} from 'axios'
// @ts-ignore
import qs from 'qs'
import cleanDeep from 'clean-deep'

const defaultheaders = {
    // Except for 'multipart/form-data' when uploading files, all others are 'application/json'
    'Content-Type': 'application/json;',
    /**
     * https://blog.csdn.net/HeatDeath/article/details/79168614
     * Indicates that all requests for this project are Ajax asynchronous http requests. If there is no such parameter, it means    that the request is a traditional synchronous HTTP request.
     */
    'X-Requested-With': 'XMLHttpRequest'
}

interface axiosToolsResponse {
    code: number,
    data: {},
    msg?: string
}

/**
 * Request interceptor
 * @param config: Pass as a parameter of api.get() | api.post() method
 */
const handleRequestConfig = (config: AxiosRequestConfig) => {
    console.log('axios-tools handleRequestConfig config=', config)
    // Recursively delete empty objects, empty arrays, empty strings, null and value values from the object. Do not change the original data。
    const Config = cleanDeep(config, {
        emptyArrays: false,
        emptyObjects: false,
        emptyStrings: false// Whether to clear empty strings
    })
    // const Config=config
    if (Config.method === 'get') {
        Config.paramsSerializer = params => {
            console.log('axios-tools paramsSerializer params=', params)
            // A querystring parsing and stringifying library with some added security.
            const qsStr = qs.stringify(params, {
                arrayFormat: 'repeat'
            })
            console.log('axios-tools paramsSerializer qsStr=', qsStr)
            return qsStr
        }
    }

    console.log('axios-tools interceptors.request config=', Config)
    return Config
}

/**
 * Response interceptor
 * Execution earlier than checkStatus method
 * @param response
 */
// @ts-ignore
const handleResponseSuccess = (response: AxiosResponse/*{ data: axiosToolsResponse, status: number }*/) => {
    console.log('axios-tools handleResponseSuccess response=', response)
    if (typeof response.data !== 'object'||response.status !== 200) { // api request failed, based on actual situation
        // eslint-disable-next-line prefer-promise-reject-errors
        return Promise.reject(response/*`axios-tools response.status !== 200 status=${response.status}`*/)// 接口Promise返回错误状态
    } else {
        return Promise.resolve(response.data)
    }
}
const handleResponseFail = (_err: { response: { status: any }; message: string }) => {
    // console.log('axios-tools handleResponseFail err=', err)
    // console.log('axios-tools handleResponseFail typeof err=',(typeof err))
    // console.log('axios-tools handleResponseFail stringify err=', JSON.stringify(err))
    const err=JSON.parse(JSON.stringify(_err))
    console.log('axios-tools handleResponseFail parse err=', err)
    if (err && axios.isCancel(err)) {
        // requestList.length = 0
        // store.dispatch('changeGlobalState', {loading: false})
        console.log('axios-tools throw axios.Cancel')
        throw new axios.Cancel('request.ts cancel api')
    } else /*if (err && err.response) */{
        switch (err.status) {
            case 400:
                err.message = 'Bad request'
                break
            case 401:
                err.message = 'Unauthorized, please log in again'
                break
            case 403:
                err.message = 'access denied'
                break
            case 404:
                err.message = 'Request error, the resource was not found'
                break
            case 405:
                err.message = 'Request method not allowed'
                break
            case 408:
                err.message = 'Request timed out'
                break
            case 500:
                err.message = 'Server-side error'
                break
            case 501:
                err.message = 'Network not implemented'
                break
            case 502:
                err.message = 'Network Error'
                break
            case 503:
                err.message = 'service is not available'
                break
            case 504:
                err.message = 'network timeout'
                break
            case 505:
                err.message = 'http version does not support the request'
                break
            default:
                err.message = `connection error : ${err.response.status}`
        }
    }
    // else {
    //     err.message = 'Failed to connect to server'
    // }
    console.log('axios-tools handleResponseFail final err=', err)
    return Promise.reject(err)
}

class Api {
    instance: AxiosInstance

    constructor(baseConfig?: AxiosRequestConfig) {
        // @ts-ignore
        if (!this.instance) {
            console.log('axios-tools constructor baseConfig=', baseConfig)
            this.instance = axios.create({
                baseURL: '',
                timeout: 10000,
                /**
                 * https://www.ruanyifeng.com/blog/2016/04/cors.html
                 * When the current request is a cross-domain type, whether to include cookies in the request, after the front-end sets   the true attribute, the back-end must be notified to allow it, otherwise the request will fail
                 */
                withCredentials: true,
                headers: defaultheaders,
                ...baseConfig
            })
            // Request interceptor
            this.instance.interceptors.request.use(handleRequestConfig, error => {
                // Do something with request error
                console.log('axios-tools interceptors.request error=', error)
                return Promise.reject(error)
            })
            // Response interceptor
            // @ts-ignore
            this.instance.interceptors.response.use(handleResponseSuccess, handleResponseFail)
        }
    }
}

const api: AxiosInstance = new Api().instance

interface axiosToolsProps {
    url: string;
    params?: {};
    headers?: {};
    baseURL?: string;
}

/**
 * use:
 *      import { get,post } from 'axios-tools';
 *      import { tool } from 'starkfrontendtools';
 *      const headers ={
          Authorization: 'Bearer ' + `${sessionStorage.getItem('token') || ''}` // 让每个请求携带自定义token
        }
 *      export const apiFunc = async (payload) => {
              const [err, data] = await tool.to(get({ url: '', params: { }, baseURL: process.env.VUE_APP_BASEURLAPI, headers}))
              if (data && data.code === 0 && !err) {
                return Promise.resolve(data)
              } else {
                return Promise.reject(Error(''))
              }
        }
 */
const get = (props: axiosToolsProps) => {
    const {url = '', params = {}/*url里?右边的参数*/, headers = {}, baseURL = ''/*接口根域名*/} = props
    console.log('axios-tools get url=', url)
    console.log('axios-tools get params=', params)
    console.log('axios-tools get headers=', headers)
    console.log('axios-tools get baseURL=', baseURL)

    //After api.get() is executed, the callback of the handleRequestConfig method will be triggered
    return api.get(url, {
        params: params, baseURL,
        headers,
        validateStatus: validateStatus
    })
    //     .then((res) => {
    //     return checkStatus(res)
    // }).catch((error) => {
    //     console.log('axios-tools get error=', error)
    //     return Promise.reject(error)
    // })
}

/**
 * use:
 *      import { get,post } from 'axios-tools';
 *      import { tool } from 'starkfrontendtools';
 *      const headers ={
          Authorization: 'Bearer ' + `${sessionStorage.getItem('token') || ''}` // 让每个请求携带自定义token
        }
 *      const [err, data] = await tool.to(post({ url: '', params: {  }, baseURL: process.env.VUE_APP_BASEURLAPI,headers}))
 *      if (data && data.code === 0 && !err) {
                return Promise.resolve(data)
              } else {
                return Promise.reject(Error(''))
         }
 */
const post = (props: axiosToolsProps) => {
    const {url = '', params = {}, headers = {}, baseURL = ''} = props
    console.log('axios-tools post url=', url)
    console.log('axios-tools post params=', params)
    console.log('axios-tools post headers=', headers)
    console.log('axios-tools post baseURL=', baseURL)

    //After api.post() is executed, the callback of the handleRequestConfig method will be triggered
    return api
        .post(url, params,
            {
                // params, Do not add this parameter, otherwise a very long parameter will be added to the url of the Post request
                validateStatus: validateStatus, baseURL, headers
            }
        )
    // .then((res) => {
    //     return checkStatus(res)
    // })
    // .catch((error) => {
    //     console.log('axios-tools post error=', error)
    //     return Promise.reject(error)
    // })
}

/**
 * Call back after handleResponseSuccess is executed
 * @param response
 */
// const checkStatus = (response: AxiosResponse) => {
//     return new Promise((resolve, reject) => {
//         console.log('axios-tools checkStatus response=', response)
//         const {code, data,msg=''}: axiosToolsResponse = response.data
//         console.log('axios-tools checkStatus code=',code,' data=',data)
//         if (response && code === 0) {
//             resolve(data)
//         } else { // Network exception
//             // eslint-disable-next-line prefer-promise-reject-errors
//             console.log(`axios-tools checkStatus response.code!==0 response=${response}`)
//             reject({code,msg})
//         }
//     })
// }

/**
 * Call back after handleRequestConfig is executed
 * @param status
 */
const validateStatus = (status: number) => {
    console.log('axios-tools  validateStatus status=', status)
    // Only the return code of 2xx will be returned normally (resolve), and all non-2xx will be treated as exceptions (reject)
    return status >= 200 && status < 300
    // return true //保证 回调 handleResponseSuccess
}

/**
 * Multi-interface concurrent requests (to avoid redundant waiting caused by await)
 * https://hentaimiao.me/frontEnd/axios/axios01.html#%E5%8D%95%E9%A1%B5%E9%9D%A2%E7%9A%84%E5%A4%9A%E6%8E%A5%E5%8F%A3%E5%B9%B6%E5%8F%91%E8%AF%B7%E6%B1%82-await-%E5%AF%BC%E8%87%B4%E5%A4%9A%E4%BD%99%E7%AD%89%E5%BE%85
 * @param requests
 * @returns {Promise<unknown[]>}
 */
// const asyncAll = (requests = []) => {
//   return axios.all(requests).then(resultArr => {
//     for (const result of resultArr) {
//       const code = result.code
//       if (code > 220 || code < 200) {
//         // proxyUtil.alertMessage(result.msg)
//       }
//     }
//     return resultArr
//   }).catch(error => {
//   })
// }

export {
    get, post, axiosToolsResponse
}
