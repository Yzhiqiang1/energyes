import { StyleSheet, View, Image, TextInput, Pressable, Text, ScrollView, Animated, PermissionsAndroid, AppState, Linking, Dimensions } from 'react-native'
import React, { Component } from 'react'
import Geolocation from '@react-native-community/geolocation';//获取定位
import { Camera,  useCameraDevice, useCodeScanner} from "react-native-vision-camera"//二维码
import { launchImageLibrary } from 'react-native-image-picker';//图片选择器
import Navbars from '../../component/Navbars/Navbars';
import { Dialog } from '@rneui/themed';
import Loading from '../../component/Loading/Loading';
import { Register } from '../../utils/app';
import store from '../../redux/store';
import { HttpService } from '../../utils/http';
import { useIsFocused } from "@react-navigation/native";
import { scene } from '../../redux/actions/user';
const LocalBarcodeRecognizer = require('react-native-local-barcode-recognizer');
const CTSD = require('../../utils/CTSD.js'); //引入坐标转换文件
const api = require('../../utils/api')//引入接口文件
import { MapView, Overlay, BaiduMapManager } from 'react-native-baidu-map'
BaiduMapManager.initSDK('sIMQlfmOXhQmPLF1QMh4aBp8zZO9Lb2A');//ios 使用 BaiduMapManager.initSDK 方法设置 api key(百度地图)
// 扫码组件
function MyComponent(props: any) {
    const device = useCameraDevice('back');
    const isFocused = useIsFocused()
    const codeScanner = useCodeScanner({
        codeTypes: ['qr', 'ean-13'],
        onCodeScanned: (codes:any) => {
            props.scanCode(codes[0].value)
            props.close()
        }
    });

    //选择照片按钮点击
    const choosePic = () => {
        const options:any = {
            mediaType: 'photo',
            includeBase64: true,//base64格式
            quality: 0.5,
            maxWidth: 200,
            maxHeight: 200,
            maxFiles: 2,
          };
        launchImageLibrary(options, (response:any) => {
            if (!response.didCancel) {
                // 相册获得的图片base64
                let source = response.assets[0].base64;
                // 处理扫描选取的二维码图片
                recoginze(source);
            }
        })
        
    }
    // 识别图片二维码
    const recoginze = async (data: any) => {
        let result = await LocalBarcodeRecognizer.decode(data.replace(",",""), {
          codeTypes: ['ean13', 'qr'],
        });
        props.close()
        props.scanCode(result)
    }


    if (device == null) return <View></View>
    return <View style={{position:'relative',height: '100%', width: '100%', }}>
        <Pressable style={styles.icon} onPress={()=>props.close()}>
            <Image style={styles.image} source={require('../../image/gb.png')}></Image>
        </Pressable>
        <Pressable style={styles.xc} onPress={()=>choosePic()}>
            <Image style={styles.image} source={require('../../image/xc.png')}></Image>
        </Pressable>
        <Camera
            photo={false}
            video={false}
            isActive={isFocused}
            style={{zIndex: 9999, height: '100%', width: '100%', }}
            onError={(error) => {
                console.error(error)
            }}
            device={device} codeScanner={codeScanner} />
    </View>
}

export class Scanqr extends Component<any,any> {
    translateY = new Animated.Value(0)
    constructor(props:any){
        super(props)
        this.state={
                //登录状态
            loginStatus: false, //默认未登录
            goLogin: true, //去登录按钮

            // 用户位置
            userLatitude:0,
            userLongitude:0,

            //地图中心点 (直接更改地图无动画效果)
            latitude: 22.614101, //维度
            longitude: 113.850261, //经度   

            //二维码ID
            qRcodeId: '',

            //地图marker标注点实际经纬度
            sign_lat: 22.614101, //维度
            sign_lng: 113.850261, //经度

            //搜索框
            positionVal: '',
            positionIndex: -1, //选中地址下标
            lastPositionVal: '', //上一次查询内容

            //地图手动选取地址
            manualAddress: '',
            //搜索出来的地址信息
            addressArr: [],
            //底部弹窗
            popupShow: false,

            //marker标注点
            markers_data: [{
                id: 0,
                width:36,
                height:54,
                latitude: 22.608515,
                longitude: 113.843689,
            }],
            //是否手动进入扫码创建设备页面
            isManual: true,
            //弹窗控制
            msgType: 1,
            visible: false,
            LoadingMsg: '',
            // 是否打开摄像头扫描
            camera: false,
            //对话框
            show: false,
            scene_id: '',
            // 权限询问
            power: false
        }
    }
    componentDidMount(): void {
        let that = this;
        this.setState({
            msgType: 1,
            visible: true,
            LoadingMsg: '加载中...'
        }) //加载效果
        //调用登录验证
        Register.userSignIn(false).then(res => {
            //更改登录状态
            that.setState({
                loginStatus: res
            })
            /**
             * 用户已登录
             * **/
            if (res) {
                let userId = store.getState().userReducer.userId; //用户ID
                /**
                 * 
                 * 登录后  之前没有存储参数
                 * **/
                if (store.getState().userReducer.scene.length == 0) {
                    this.setState({
                        visible: false,
                    })
                    /**
                     * 登录后  之前有存储参数
                     * **/
                } else {
                    let scene_id = store.getState().userReducer.scene[0];
                    let bd_lng = store.getState().userReducer.scene[1];
                    let bd_lat = store.getState().userReducer.scene[2];
                    //调用创建设备
                    that.greateDevice(userId, scene_id, bd_lng, bd_lat);
                    //更新数据
                    that.setState({
                        latitude: bd_lat,
                        longitude: bd_lng,
                        sign_lat: bd_lat,
                        sign_lng: bd_lng,
                    })
                    //地址逆解析
                    that._reverseGeocoder();
                }
                this.setState({
                    visible: false,
                })
                /***
                 * 用户未登录 且扫码进入
                 * ****/
            } else {
                this.setState({
                    visible: false,
                })
            }
        });
    }
    //地图加载完成
    onLoad=()=>{ //la  //ln
        let that = this
        async function requestLocationPermission() {
            try {
              const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
              if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log('位置权限已授权');
                // //获取当前经纬度
                Geolocation.getCurrentPosition(
                    (position) => {
                        let location = CTSD.wgs84tobd09(Number(position.coords.longitude),Number(position.coords.latitude))
                        that.setState({
                            userLatitude: location[1],
                            userLongitude: location[0],
                        })
                    },
                    (error) => {
                        // 弹窗提示
                        that.setState({
                            msgType: 2,
                            visible: true,
                            LoadingMsg: '获取定位失败，请检查手机是否打开位置信息'
                        },()=>{
                            setTimeout(()=>{
                                that.setState({
                                    visible: false,
                                })
                            },3000)
                        })
                    },
                );
              } else {
                console.log('位置权限被拒绝');
              }
            } catch (err) {
                console.log(err);
            }
          }
        requestLocationPermission()
    }

    _mapMenu=()=>{
       //打开弹窗
        Animated.timing(this.translateY,
            {
                toValue: -400,
                duration: 300,
                useNativeDriver: true
            }
        ).start();
    }
    bindKeywordsName=(e:string)=>{
        this.setState({
            positionVal: e
        })
    }
    _search=()=>{
        let that = this;
        let val = that.state.positionVal; //当前查询
        let lastVal = that.state.lastPositionVal; //上一次查询
        let sign_lat = that.state.sign_lat; //地图marker标注点纬度
        let sign_lng = that.state.sign_lng; //地图marker标注点经度
        if (val) {
            //判断如果和上一次输入内容相同 只需要打开弹窗
            if (val != lastVal) {
                //加载效果
                this.setState({
                    msgType: 1,
                    visible: true,
                    LoadingMsg: '查询中...'
                })

                //天地图地点搜索
                let lonlat = CTSD.gcj02towgs84(Number(sign_lng), Number(sign_lat)); //经纬度转换
                let mapBound = lonlat[0] + "," + lonlat[1] + "," + lonlat[0] + "," + lonlat[1]
                //搜索参数
                let postStr = {
                    "keyWord": val,
                    "level": 18,
                    "mapBound": mapBound,
                    "queryType": 1,
                    "start": 0,
                    "count": 10,
                    show: 2
                }
               
                //对象转换为查询字符串
                let params = new URLSearchParams();
                params.append('postStr', JSON.stringify(postStr));
                params.append('type', 'query');
                params.append('tk', '1ae9bec49dfa1680087dcdabf52a0ec4');//天地图 key
                let queryString = params.toString();

                fetch(api.tdSearch+`?${queryString}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'text/plain',
                    },
                }).then(response => response.json())
                .then(response => {
                        // 关闭加载效果
                        this.setState({
                            visible: false,
                        })
                        if (response.status.infocode == 1000) {
                            if (response.pois) {
                                let pois = response.pois;
                                //更新数据
                                that.setState({
                                    addressArr: pois,
                                    positionIndex: -1, //选中地址下标
                                    lastPositionVal: val, //上一次查询内容
                                },()=>{
                                    //打开弹窗
                                    Animated.timing(this.translateY,
                                        {
                                            toValue: -400,
                                            duration: 300,
                                            useNativeDriver: true
                                        }
                                    ).start();
                                })
                            } else {
                                that.setState({
                                    addressArr: [],
                                    positionIndex: -1, //选中地址下标
                                    lastPositionVal: val, //上一次查询内容
                                },()=>{
                                    //打开弹窗
                                    Animated.timing(this.translateY,
                                        {
                                            toValue: -400,
                                            duration: 300,
                                            useNativeDriver: true
                                        }
                                    ).start();
                                })
                            }
                        } else {
                            //弹窗提示
                            this.setState({
                                msgType: 2,
                                visible: true,
                                LoadingMsg: '查询失败'
                            },()=>{
                                setTimeout(()=>{
                                    this.setState({
                                        visible: false,
                                    })
                                },2000)
                            })
                        }
                }).catch((error) => {
                    this.setState({
                        visible: false,
                    })
                    this.setState({
                        msgType: 2,
                        visible: true,
                        LoadingMsg: error
                    },()=>{
                        setTimeout(()=>{
                            this.setState({
                                visible: false,
                            })
                        },2000)
                    })
                })
            } else {
                //打开弹窗
                Animated.timing(this.translateY,
                    {
                        toValue: -400,
                        duration: 300,
                        useNativeDriver: true
                    }
                ).start();
            }
        } else {
            this.setState({
                msgType: 2,
                visible: true,
                LoadingMsg: '关键字不能为空'
            },()=>{
                setTimeout(()=>{
                    this.setState({
                        visible: false,
                    })
                },2000)
            })
        }
    }
    onClose=()=>{
        //关闭弹窗
        Animated.timing(this.translateY,
            {
                toValue: 0,
                duration: 300,
                useNativeDriver: true
            }
        ).start();
    }
    _select=(e:any)=>{
        let that = this;
        let index = Number(e); //获取选中下标
        let positionIndex = that.state.positionIndex; //上次选中下标
        if (index != positionIndex) {
            //更新数据
            that.setState({
                positionIndex: index, //更新选中下标
                manualAddress: '', //清空地图手动选取地址
            })
            //获取选中经纬度
            let lonlat = that.state.addressArr[index].lonlat.split(",");
            let location = CTSD.wgs84tobd09(Number(lonlat[0]),Number(lonlat[1]));
            this.setState({
                longitude: location[0],
                latitude: location[1],
                sign_lng: location[0],
                sign_lat: location[1],
            })
        }
    }
    //手动获取时  点击地图获取坐标
    _view=(e:any)=> {
        let that = this;
        let lat = e.latitude;
        let lng = e.longitude;
        //更新地图marker标注点经纬度
        that.setState({
            longitude: lng,
            latitude: lat,
            sign_lat: lat,
            sign_lng: lng,
            positionIndex: -1, //重置选中地址下标
        }, () => {
            //地址逆解析
            that._reverseGeocoder();
            //打开弹窗
            Animated.timing(this.translateY,
                {
                    toValue: -400,
                    duration: 300,
                    useNativeDriver: true
                }
            ).start();
        })
    }

    //地址逆解析
    _reverseGeocoder=()=> {
        let that = this;
        //天地图地址逆解析
        let lonlat = CTSD.gcj02towgs84(Number(that.state.sign_lng), Number(that.state.sign_lat))

        //请求参数
        let postStr = {
            'lon': lonlat[0],
            'lat': lonlat[1],
            'ver': 1
        }

        let params = new URLSearchParams();
        params.append('postStr', JSON.stringify(postStr));
        params.append('type', 'query');
        params.append('tk', '1ae9bec49dfa1680087dcdabf52a0ec4');//天地图 key
        let queryString = params.toString();
        fetch(api.geocoder+`?${queryString}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'text/plain',
            },
        }).then(response => response.json())
        .then(response => {
            // 关闭加载效果
            this.setState({
                visible: false,
            })
            if (response.status == 0) {
                let address = response.result.formatted_address + '附近';
                that.setState({
                    manualAddress: address
                }); //更新地址
            }else {
                that.setState({
                    manualAddress: '查询地址失败'
                }) //更新地址
            }
        }).catch((error) => {
            console.log("error=======",error);
        })
    }
    // 打开摄像头扫描
    openCamera = async ()=>{
        let that = this
        async function onAuth(){
            const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log('权限已开启');
                that.setState({
                    camera: true
                })
            } else {
                // 拒绝后弹窗提示
                that.setState({
                    power: true
                })
            }
        }
        onAuth()
    }
    install=()=>{
        Linking.openSettings()
        this.setState({
            power: false
        })
    }
    // 关闭摄像头
    closeCamera=()=>{
        this.setState({
            camera: false
        })
    }
    //扫码创建设备
    _scanCode=(res:any)=> {
        let that = this;
        //获取标识点位置
        let lng = that.state.sign_lng;
        let lat = that.state.sign_lat;
        //火星坐标系转为百度坐标系
        let gcj02tobd09 = CTSD.gcj02tobd09(Number(lng),Number(lat));
        let bd_lng = gcj02tobd09[0];
        let bd_lat = gcj02tobd09[1];
        //获取登录状态
        let loginStatus = that.state.loginStatus;
        let userId = store.getState().userReducer.userId; //用户ID
        //二维码ID
        let scene_id = ''
        let path = res ? res : '';
        if (path != '' && path != '*'){
            if (res) {
                scene_id = path.match(/\/weixin\/(\S*).htm/) ? path.match(/\/weixin\/(\S*).htm/)[1] : '';
            }
            // 是否登录
            if (loginStatus) {
                //调用创建设备
                if (scene_id != '') {
                    that.greateDevice(userId, scene_id, bd_lng, bd_lat);
                } else {
                    this.setState({
                        msgType: 2,
                        visible: true,
                        LoadingMsg: '请检查二维码，您扫描的是非设备二维码！'
                    },()=>{
                        setTimeout(()=>{
                            this.setState({
                                visible: false,
                                scene_id: scene_id
                            })
                        },2000)
                    })
                }
            } else {
                this.setState({
                    show: true,
                    scene_id: scene_id
                })
            }
        }else{
            this.setState({
                msgType: 2,
                visible: true,
                LoadingMsg: '请检查二维码，您扫描的是非设备二维码！'
            },()=>{
                setTimeout(()=>{
                    this.setState({
                        visible: false,
                    })
                },2000)
            })
        }
    }
    //创建设备
    greateDevice=(userId: any, scene_id: any, bd_lng: any, bd_lat: any)=>{
        let that = this;
        //扫码创建设备
        this.setState({
            msgType: 1,
            visible: true,
            LoadingMsg: '创建中...'
        })
        HttpService.apiPost(api.appScanCodeCreateDevice, {
            userId: userId,
            scanContent: scene_id,
            lng: bd_lng,
            lat: bd_lat,
           }).then((data:any) => {
            /** 无论是否创建成功都重置 **/
            that.setState({
                qRcodeId: ''
            });
            // app.globalData.scene = [];
            if (data.flag == '00') {
                this.setState({
                    visible: false,
                })
                this.setState({
                    msgType: 2,
                    visible: true,
                    LoadingMsg: '设备创建成功'
                },()=>{
                    setTimeout(()=>{
                        this.setState({
                            visible: false,
                        })
                    },2000)
                })
            } else {
                //关闭加载效果
                this.setState({
                    visible: false,
                })
                this.setState({
                    msgType: 2,
                    visible: true,
                    LoadingMsg: data.msg
                },()=>{
                    setTimeout(()=>{
                        this.setState({
                            visible: false,
                        })
                    },2000)
                })
            }
            if (that.state.isManual == false) {
                //跳转到首页
                // setTimeout(function () {
                //     wx.reLaunch({
                //         url: '/pages/index/index'
                //     })
                // }, 3000)
            }
        }).catch((fail_message) => {
            /** 无论是否创建成功都重置 **/
            that.setState({
                qRcodeId: ''
            });
            // app.globalData.scene = [];
            //关闭加载效果
            this.setState({
                visible: false,
            })
            this.setState({
                msgType: 2,
                visible: true,
                LoadingMsg: fail_message
            },()=>{
                setTimeout(()=>{
                    this.setState({
                        visible: false,
                    })
                },2000)
            })
        });
    }
    // 跳转登录页
    GoLogIn=()=>{
        let data = this.state
        store.dispatch(scene({scene:[
            data.scene_id,data.longitude,data.latitude
        ]}))
        this.props.navigation.navigate('BindAccount')
        this.setState({
            show: false
        })
    }
    render() {
        return (
            <View>
                <Navbars
                    name={'扫码创建设备'}
                    showHome={false}
                    showBack={true}
                    props={this.props}
                ></Navbars>
                {!this.state.camera?
                    <View style={styles.container}>
                        {/* 地图 */}
                        <MapView 
                            style={{width:'100%',height:'100%'}}
                            center={{ longitude: this.state.longitude, latitude: this.state.latitude }}
                            showsUserLocation={true}
                            locationData={{ longitude: this.state.userLongitude, latitude: this.state.userLatitude }}
                            zoom={12}
                            onMapClick={this._view}
                            onMapLoaded={this.onLoad}
                        >
                            <Overlay.Marker 
                                icon={require('../../image/dw.png')}
                                location={{ 
                                    longitude: this.state.longitude,
                                    latitude: this.state.latitude 
                                }} 
                            />
                        </MapView>
                        {/* 搜索框 */}
                        <View style={styles.search}>
                            <View style={styles.input}>
                                <Pressable style={styles.mapMenu} onPress={this._mapMenu}>
                                    <Image style={styles.img} source={require('../../image/mapMenu.png')}></Image>
                                </Pressable>
                                <TextInput style={styles.in} value={this.state.positionVal} onChangeText={e=>this.bindKeywordsName(e)} placeholder={'输入关键字搜索或点击地图选址'}></TextInput>
                                <Pressable style={styles.but} onPress={this._search}>
                                    <Image style={styles.ico} source={require('../../image/se.png')} ></Image>
                                </Pressable>
                            </View>
                        </View>
                        {/* 扫码创建 */}
                        <Pressable style={styles.scanCode} onPress={this.openCamera}>
                            <Image style={styles.img} source={require('../../image/scanCode.png')}></Image>
                        </Pressable>
                        {/* 摄像头权限拒绝后询问 */}
                        <Dialog
                            isVisible={this.state.power}
                            backdropStyle={{height:'120%'}}
                        >
                            <Text style={styles.hint}>当前摄像头权限已拒绝，无法使用扫码创建设备功能，是否去设置开启</Text>
                            <View style={styles.hintBox}>
                                <Text 
                                    style={styles.butL} 
                                    onPress={()=>this.setState({ power: false})}
                                >取消</Text>
                                <Text 
                                    style={styles.butR}
                                    onPress={this.install}
                                >去设置</Text>
                            </View>
                        </Dialog>
                        {/* 底部弹窗 */}
                        <Animated.View style={[styles.btmDialog,{transform:[{translateY:this.translateY}]}]}>
                            <View style={styles.popupHead}>
                                <Text style={styles.text}>选择位置</Text>
                                <Pressable style={styles.popupClose} onPress={this.onClose}>
                                    <Image style={styles.ico} source={require('../../image/search-close.png')}></Image>
                                </Pressable>
                            </View>

                            <View style={styles.popup}>
                                {this.state.manualAddress!=''?
                                    <Text style={styles.manualAddress}>
                                        {this.state.manualAddress}
                                    </Text>:''
                                }
                                <ScrollView style={styles.popupCon}>
                                    {this.state.addressArr.length > 0?
                                        this.state.addressArr.map((item:any,index:number)=>{
                                            return(
                                                <Pressable 
                                                    key={index}
                                                    style={[styles.list,index == this.state.positionIndex ? styles.on:null]}
                                                    onPress={()=>this._select(index)}
                                                >
                                                    <View>
                                                        <Text style={[styles.name,index == this.state.positionIndex ? styles.on:null]}>
                                                            {item.name}
                                                        </Text>
                                                        <Text style={[styles.address,index == this.state.positionIndex ? styles.on:null]}>
                                                            {item.province}{item.city}{item.county}{item.address}
                                                        </Text>
                                                    </View>
                                                </Pressable>
                                            )
                                        })
                                        :
                                        <Text style={styles.empty}>暂无查询内容.</Text>
                                    }
                                </ScrollView>
                            </View>
                        </Animated.View>
                    </View>
                    :<MyComponent close={this.closeCamera} scanCode={this._scanCode}></MyComponent>
                }
                <Loading 
                    type={this.state.msgType} 
                    visible={this.state.visible} 
                    LoadingMsg={this.state.LoadingMsg}>
                </Loading>
                <Dialog 
                    overlayStyle={styles.overlayStyle} 
                    isVisible={this.state.show}
                    backdropStyle={{height:'120%'}}
                    >
                    <Dialog.Title titleStyle={styles.titleStyle} title="未登录"/>
                    <Text style={styles.warn}>你还未登录点击去登录按钮登,请录后进行创建设备,点击取消放弃创建</Text>
                    <View style={styles.bottom}>
                        <Text 
                        style={styles.bottomBut} 
                        onPress={()=>this.setState({show: false})}
                        >取消</Text>
                        <Text 
                        style={[styles.bottomBut,styles.bottomButR]}
                        onPress={()=>this.GoLogIn()}
                        >去登录</Text>
                    </View>
                </Dialog>
            </View>
        )
    }
}

const styles = StyleSheet.create({
    container:{
        position: 'absolute',
        top: 60,
        width: '100%',
        height: Dimensions.get('window').height - 40,
        backgroundColor: '#f4f4f4',
        zIndex: 9,
    },
    search:{
        position: 'absolute',
        top: 10,
        left: 15,
        right: 15,
        height: 40,
        zIndex: 999,
    },
    input:{
        position: 'relative',
        width: '100%',
        height: 40,
        backgroundColor: '#fff',
        paddingLeft: 45,
        paddingRight: 45,
        overflow: 'hidden',
    },
    mapMenu:{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 40,
        height: 40,
        zIndex: 999,
        padding: 7,
        overflow: 'hidden',
    },
    img:{
        width: '100%',
        height: '100%',
    },
    in:{
        position: 'relative',
        width: '100%',
        height: 40,
        fontSize: 16,
        color: '#333',
        backgroundColor: '#fff',
        zIndex: 9,
        overflow: 'hidden',
    },
    but:{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 40,
        height: 40,
        backgroundColor: '#fff',
        zIndex: 99,
        overflow: 'hidden',
    },
    ico:{
        position: 'absolute',
        top: 11,
        left: 11,
        width: 18,
        height: 18,
    },
    scanCode:{
        position: 'absolute',
        bottom: 30,
        left: '50%',
        marginLeft: -20,
        width: 60,
        height: 60,
        backgroundColor: '#fff',
        borderRadius: 5,
        zIndex: 99,
        overflow: 'hidden',
    },
    dialogBox:{
        position: 'absolute',
        bottom: -20,
        width: '100%',
        height: '45%',
    },
    popupHead:{
        position: 'absolute',
        top: 0,
        left: 0,
        right:0,
        height: 40,
        lineHeight: 40,
        fontSize: 18,
        color: '#333333',
        borderBottomColor:'#f2f2f2',
        borderBottomWidth:1,
        borderStyle: 'solid',
        zIndex: 99,
        overflow: 'hidden'
    },
    popupClose:{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 40,
        height: 40,
        padding: 10,
        zIndex: 99,
        overflow: 'hidden',
    },
    text:{
        marginLeft: 10,
        height: 40,
        lineHeight: 45,
        fontWeight: '700',
        fontSize: 18,
    },
    popup:{
        position: 'absolute',
        top: 40,
        right: 0,
        left: 0,
        bottom: 0,
    },
    manualAddress:{
        position: 'relative',
        width: '100%',
        padding: 10,
        fontSize: 16,
        color:'#1989fa',
        backgroundColor: '#ecf9ff',
        overflow: 'hidden',
    },
    popupCon:{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
    },
    list:{
        position: 'relative',
        width: '100%',
        padding: 10,
        borderBottomColor: '#e2e2e2',
        borderStyle: 'solid',
        borderBottomWidth: 1,
        display: 'flex',
        overflow: 'hidden',
    },
    on:{
        backgroundColor: '#ecf9ff',
        color:'#1989fa'
    },
    name:{
        position: 'relative',
        width: "100%",
        height: 20,
        lineHeight: 20,
        fontSize: 16,
        color: '#333',
        overflow: 'hidden',
    },
    address:{
        position: 'relative',
        width: '100%',
        fontSize: 16,
        color: '#999',
        overflow: 'hidden',
    },
    empty:{
        position: 'relative',
        width: '100%',
        height: 40,
        lineHeight: 40,
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
        overflow: 'hidden',
    },
    icon:{
        position:'absolute',
        top:30,
        left:30,
        width:25,
        height:25,
        zIndex:99999,
    },
    xc:{
        position:'absolute',
        bottom:30,
        right:30,
        width:45,
        height:45,
        zIndex:99999,
        display:'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: '#333'
    },
    image:{
        width:25,
        height:25,
    },
    sm:{
        position:'absolute',
        top:'50%',
        left:'50%',
        marginLeft: -80,
        marginTop: -80,
        width: 160,
        height: 160,
        zIndex:99999
    },
    titleStyle:{
        marginTop:20,
        textAlign:'center',
        width:'100%',
        fontSize: 22,
        fontWeight: '800',
        color: '#191919'
    },
    overlayStyle:{
        display: 'flex',
        alignItems: 'center',
        width: '80%',
        height: '33%',
        borderRadius: 10,
    },
    warn:{
        textAlign: 'center',
        width: '90%',
        fontSize: 22,
        marginTop: 20
    },
    bottom:{
        position: 'absolute',
        bottom: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        borderTopColor: '#f3f3f3',
        borderTopWidth: 1,
        borderStyle: 'solid',
    },
    bottomBut:{
        height: 60,
        lineHeight: 70,
        flex:1,
        textAlign:'center',
        fontSize: 22,
        fontWeight: '800',
        color: '#191919'
    },
    bottomButR:{
        color: '#576b95',
        borderLeftColor: '#f3f3f3',
        borderLeftWidth: 1,
        borderStyle: 'solid',
    },
    hint:{
        color: '#333',
        fontSize: 18,
    },
    hintBox:{
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        marginTop: 10,
        height: 30,
        width: '100%'
    },
    butR:{
        position:'absolute',
        right: 10,
        top: 10,
        fontSize: 16,
        color: '#6dabdf'
    },
    butL:{
        position:'absolute',
        left: 10,
        top: 10,
        fontSize: 16,
    },
    btmDialog: {
        position:'absolute',
        bottom: -400,
        width: '100%',
        height: 400,
        backgroundColor: '#fff',
        borderRadius: 5,
        zIndex: 999
    }
})

export default Scanqr