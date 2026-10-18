import React, {useRef, useState, useEffect} from 'react';
import {ActivityIndicator, BackHandler, Linking, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {WebView} from 'react-native-webview';

const HOME = 'https://www.pizzadesilva.de/';
const allowed = (raw) => {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && ['pizzadesilva.de', 'www.pizzadesilva.de'].includes(u.hostname);
  } catch { return false; }
};
export default function App() {
  const web = useRef(null);
  const [canBack, setCanBack] = useState(false);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canBack) { web.current?.goBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [canBack]);
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#7f100b" />
      <View style={styles.header}>
        <Text style={styles.brand}>🍕 Pizza De Silva</Text>
        <TouchableOpacity accessibilityLabel="Startseite" onPress={() => {setOffline(false); web.current?.injectJavaScript("window.location.href='https://www.pizzadesilva.de/';true;");}}>
          <Text style={styles.home}>Startseite</Text>
        </TouchableOpacity>
      </View>
      {offline ? (
        <View style={styles.center}>
          <Text style={styles.title}>Keine Verbindung</Text>
          <Text style={styles.note}>Bitte prüfe deine Internetverbindung und versuche es erneut.</Text>
          <TouchableOpacity style={styles.retry} onPress={() => {setOffline(false);web.current?.reload();}}>
            <Text style={styles.retryText}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <WebView
        ref={web}
        source={{uri: HOME}}
        style={[styles.web, offline && styles.hidden]}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        originWhitelist={['https://*']}
        onNavigationStateChange={nav => {setCanBack(nav.canGoBack);setLoading(nav.loading);}}
        onShouldStartLoadWithRequest={req => {
          if (allowed(req.url)) return true;
          if (/^(https:|mailto:|tel:)/.test(req.url)) Linking.openURL(req.url).catch(()=>{});
          return false;
        }}
        onError={() => setOffline(true)}
        onHttpError={e => {if (e.nativeEvent.statusCode >= 500 && e.nativeEvent.url.startsWith(HOME)) setOffline(true);}}
        renderLoading={() => <ActivityIndicator style={styles.spinner} size="large" color="#7f100b"/>}
        startInLoadingState
      />
      {loading && !offline ? <View style={styles.progress}><ActivityIndicator color="#7f100b" size="small"/></View> : null}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:'#fff9f3'}, header:{height:54,backgroundColor:'#7f100b',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16},
  brand:{color:'white',fontSize:19,fontWeight:'bold'},home:{color:'#ffe1a0',fontSize:14,fontWeight:'600'},web:{flex:1,backgroundColor:'#fff9f3'},
  hidden:{display:'none'},center:{flex:1,justifyContent:'center',alignItems:'center',padding:24},title:{fontSize:22,fontWeight:'bold',color:'#7f100b'},
  note:{fontSize:15,textAlign:'center',marginTop:12},retry:{backgroundColor:'#7f100b',padding:14,borderRadius:12,marginTop:20},retryText:{color:'white',fontWeight:'bold'},
  progress:{position:'absolute',right:12,top:62},spinner:{flex:1}
});
