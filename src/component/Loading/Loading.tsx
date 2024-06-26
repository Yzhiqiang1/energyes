import { StyleSheet, Text, View } from 'react-native'
import React, { Component } from 'react'
import { Dialog } from '@rneui/themed';


export class Loading extends Component<any,any> {
    static defaultProps = {
        type: 1,
        LoadingMsg: '加载中...',
        visible: false
    }

    render() {
        return (
            this.props.type == 1 ?
            <Dialog 
                overlayStyle={styles.Loading} 
                isVisible={this.props.visible}
                backdropStyle={{height:'120%'}}
                >
                <Dialog.Loading />
                <Text style={styles.text}>{this.props.LoadingMsg}</Text>
            </Dialog>:
            <Dialog 
                overlayStyle={styles.showLoading} 
                isVisible={this.props.visible}
                backdropStyle={{height: 0}}
                >
                <Text style={styles.showText}>{this.props.LoadingMsg}</Text>
            </Dialog>
        )
    }
}
const styles = StyleSheet.create({
    Loading: {
        display:'flex',
        alignItems:'center',
        width:'33%',
        borderRadius:10,
    },
    showLoading:{
        display:'flex',
        alignItems:'center',
        borderRadius:10,
        padding: 5,
        paddingLeft: 20,
        paddingRight: 20,
        backgroundColor:'#333',
        width:'auto'
    },
    text: {
        fontSize:18,
        color: '#333',
    },
    showText: {
        maxWidth: 200,
        fontSize:18,
        color: '#fff',
    },
})
export default Loading