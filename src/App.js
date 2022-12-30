import logo from "./logo.svg";
import "./App.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "../config/firebase";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc
} from "firebase/firestore/lite";

function App() {
  const [localStream, setLocalStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [roomId, setRoomId] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceOnly, setIsVoiceOnly] = useState(false);
  const pc = useRef();

  const endCall = useCallback(async () => {
    if (pc.current) {
      const roomRef = await collection(db, "rooms");
      const roomRefSnap = getDocs(roomId);
      const roomRefDel = deleteDoc(roomRefDel);
      pc.current?.removeStream(localStream);
      pc.current?.removeStream(remoteStream);
      // pc.current.getSenders().forEach((sender) => {
      //   pc.current?.removeTrack(sender);
      // })
      pc.current?.close();
    }
    setRoomId("");
    setLocalStream(undefined);
    setRemoteStream(undefined);
  }, [roomId]);

  useEffect(() => {
    const channelDoc = firestore().collection("rooms");

    const subscribeDelete = channelDoc.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "removed" && change.doc.id === roomId) {
          endCall();
        }
      });
    });

    return () => {
      subscribeDelete();
    };
  }, [endCall, roomId]);

  const stream = () => {
    navigator.mediaDevices();
    RTCPeerConnection;
  };
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between"
        }}
      >
        <video src="#" id="#vcaller" width={500} height={300}></video>
        <div style={{ width: 20 }} />
        <video src="#" id="#vcallee" width={500} height={300}></video>
      </div>
    </div>
  );
}

export default App;

import { StyleSheet, Text, View } from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  MediaStream,
  MediaStreamTrack,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
  mediaDevices
} from "react-native-webrtc";
import firestore, {
  FirebaseFirestoreTypes
} from "@react-native-firebase/firestore";
import { Button, Input } from "components";
import { heightSize, titleStyle, widthSize } from "utils";
import { List } from "react-native-paper";

const configuration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302'
    }
  ],
  iceCandidatePoolSize: 10,
};

interface CallViewProps {
  navigation: any;
}

const CallView = ({ navigation }: CallViewProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | undefined>();
  const [remoteStream, setRemoteStream] = useState<MediaStream | undefined>();
  const [roomId, setRoomId] = useState<string>('')
  const [inputValue, setInputValue] = useState<string>('')
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [isVoiceOnly, setIsVoiceOnly] = useState(false)
  const pc = useRef<RTCPeerConnection | undefined>();


  const endCall = useCallback(async () => {
    if (pc.current) {
      const roomRef = await firestore().collection('rooms').doc(roomId).delete();
      pc.current?.removeStream(localStream as MediaStream);
      pc.current?.removeStream(remoteStream as MediaStream);
      // pc.current.getSenders().forEach((sender) => {
      //   pc.current?.removeTrack(sender);
      // })
      pc.current?.close();
    }
    setRoomId('')
    setLocalStream(undefined);
    setRemoteStream(undefined);
  }, [roomId]);

  useEffect(() => {
    const channelDoc = firestore().collection("rooms");

    const subscribeDelete = channelDoc
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "removed" && change.doc.id === roomId) {
            endCall();
          }
        });
      });

    return () => {
      subscribeDelete();
    };
  }, [endCall, roomId]);

  const onStream = async () => {
    const isFront = true;
    const devices: any = await mediaDevices.enumerateDevices();
    const facing = isFront ? "front" : "environment";
    const facingMode = isFront ? "user" : "environment";
    const videoSourceId = devices.find(
      (device: any) => device.kind === "videoinput" && device.facing === facing
    );
    const constraints = {
      audio: true,
      // video: {
      //   mandatory: {
      //     minWidth: widthSize, // Provide your own width, height and frame rate here
      //     minHeight: heightSize,
      //     minFrameRate: 30,
      //   },
      //   facingMode,
      //   optional: videoSourceId ? [{ sourceId: videoSourceId }] : [],
      // },
      video: {
        frameRate: 30,
        facingMode,
        deviceId: videoSourceId
      }
    };

    const s = await mediaDevices.getUserMedia(constraints);

    // if (isVoiceOnly) {
    //   const videoTrack = s.getVideoTracks()[0];
    //   videoTrack.enabled = false;
    // };

    setLocalStream(s as MediaStream);
    pc.current?.addStream(s as MediaStream);
    // s?.getTracks().forEach((track) => {
    //   pc.current?.addTrack(track, s);
    // })
  };

  const startCall = async () => {
    pc.current = new RTCPeerConnection(
      configuration
    );

    onStream();

    peerTrack();

    const roomRef = firestore().collection('rooms').doc();
    setRoomId(roomRef.id)

    collectIceCandidates(roomRef, "caller", "callee")

    const offer = await pc.current?.createOffer(
      {
        mandatory: {
          OfferToReceiveAudio: true,
          OfferToReceiveVideo: true,
          VoiceActivityDetection: true
        }
      }
    );

    await pc.current?.setLocalDescription(offer as RTCSessionDescription);

    const roomWithOffer = { offer };
    await roomRef.set(roomWithOffer);

    roomRef.onSnapshot(async snapshot => {
      const data = snapshot.data();
      if (!pc.current?.remoteDescription && data && data.answer) {
        const rtcSessionDescription = new RTCSessionDescription(data.answer);
        await pc.current?.setRemoteDescription(rtcSessionDescription);
      }
    });
  };

  const joinCall = async (id: string) => {

    const roomRef = await firestore().collection('rooms').doc(id);
    const roomSnapshot = await roomRef.get();

    if (!roomSnapshot.exists) return endCall();
    setInputValue("")
    setRoomId(id)
    pc.current = new RTCPeerConnection(configuration);
    onStream();
    peerTrack();

    collectIceCandidates(roomRef, "callee", "caller")

    const offer = roomSnapshot?.data()?.offer;
    await pc.current.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answer as RTCSessionDescription);

    const roomWithAnswer = { answer };
    await roomRef.update(roomWithAnswer);

    roomRef.onSnapshot(async snapshot => {
      const data = snapshot.data();
      if (!pc.current?.remoteDescription && data && data.answer) {
        const rtcSessionDescription = new RTCSessionDescription(data.answer);
        await pc.current?.setRemoteDescription(rtcSessionDescription);
      }
    });
  };

  const collectIceCandidates = async (
    roomRef: FirebaseFirestoreTypes.DocumentReference<FirebaseFirestoreTypes.DocumentData>,
    localName: string,
    remoteName: string,
  ) => {

    const candidates = roomRef.collection(localName);
    // console.log('roomRef', roomRef);
    // console.log('candidates', candidates);

    if (pc.current) {
      pc.current.addEventListener("icecandidate", (e: any) => {
        // console.log("icecandidate", e);
        if (e.candidate) {
          candidates.add(e.candidate);
        }
      })
    }

    roomRef.collection(remoteName).onSnapshot(snapshot => {
      snapshot.docChanges().forEach(async change => {
        if (change.type === 'added') {
          const data = new RTCIceCandidate(change.doc.data());
          await pc.current?.addIceCandidate(data);
        }
      });
    });
  }

  const peerTrack = async () => {
    if (pc.current) {
      // await pc.current.getLocalStreams().forEach((e) => {
      //   console.log("getLocalStreams", e.toURL());

      // })
      // await pc.current.getRemoteStreams().forEach((e) => {
      //   console.log("getRemoteStreams", e.toURL());
      // })
      await pc.current.addEventListener('icecandidateerror', event => {
        // console.log("icecandidateerror", event);
      });
      await pc.current.addEventListener('iceconnectionstatechange', event => {
        // console.log("iceconnectionstatechange", event);
        switch (pc.current?.iceConnectionState) {
          case 'connected':
            console.log("connected");
            break;
          case 'completed':
            console.log("completed");
            break;
        };
      });
      pc.current.onaddstream = (e: any) => {
        console.log("addstream", e);
      }
      await pc.current.addEventListener("onaddstream", (e: any) => {
        console.log("addstream", e);
      })
      await pc.current.addEventListener("addstream", (e: any) => {
        console.log("addstream", e);
      })
      await pc.current.addEventListener("streamadd", (e: any) => {
        console.log("addstream", e);
      })
      await pc.current.addEventListener("stream", (e: any) => {
        console.log("addstream", e);
      })

      pc.current.onaddstream = (e: any) => {
        console.log('e onaddstream', e);
        if (e.stream && remoteStream !== e.stream) {
          setRemoteStream(e.stream);
        } else {
          const [s] = e?.streams;
          setRemoteStream(s);
        }
      }

      await pc.current.addEventListener("addstream", (e: any) => {
        console.log('listener ontrack', e);
        if (e.stream && remoteStream !== e.stream) {
          setRemoteStream(e.stream);
        } else {
          const [s] = e?.streams;
          setRemoteStream(s);
        }
      })

      await pc.current.addEventListener("track", (e: any) => {
        console.log('listener ontrack', e);
        if (e.stream && remoteStream !== e.stream) {
          setRemoteStream(e.stream);
        } else {
          const [s] = e?.streams;
          setRemoteStream(s);
        }
      })

      pc.current.ontrack = (e: any) => {
        console.log('e ontrack', e);
        if (e.stream && remoteStream !== e.stream) {
          setRemoteStream(e.stream);
        } else {
          const [s] = e?.streams;
          setRemoteStream(s);
        }
      }
    }
  }

  const toggleMute = () => {
    if (!remoteStream) {
      return;
    }
    localStream?.getAudioTracks().forEach(track => {
      // console.log(track.enabled ? 'muting' : 'unmuting', ' local track', track);
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    });
  };
  console.log('remoteStream', remoteStream);

  return (
    <View>
      <Input value={roomId} style={{ width: '75%' }} />
      {roomId.length === 0 ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Input value={inputValue} onChangeText={(e: string) => setInputValue(e)} style={{ width: '75%' }} />
        <Button onPress={() => joinCall(inputValue)} style={{ width: '25%' }}>Join</Button>
      </View> : null}
      {(localStream || remoteStream) ? null : <List.Item
        title={'Barus'}
        titleStyle={[titleStyle]}
        onPress={() => startCall()} />}
      {localStream && <Button onPress={() => endCall()} >end call</Button>}

      {localStream && <RTCView mirror style={styles.rctView} streamURL={localStream.toURL()} />}
      {remoteStream && <RTCView mirror style={styles.rctView} streamURL={remoteStream.toURL()} />}
    </View>
  );
};

export default CallView;

const styles = StyleSheet.create({
  rctView: { height: 500, width: 300 }
});
