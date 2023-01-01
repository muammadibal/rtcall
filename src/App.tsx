import * as React from "react";
import "./App.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "./config/firebase";

let server = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }

function App() {
  const [localStream, setLocalStream] = useState<MediaStream | undefined>();
  const [remoteStream, setRemoteStream] = useState<MediaStream | undefined>();
  const [roomId, setRoomId] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceOnly, setIsVoiceOnly] = useState(false);

  const vcaller = useRef<any>();
  const vcallee = useRef<HTMLVideoElement>();
  const pc = useRef<RTCPeerConnection>();

  const endCall = useCallback(async () => {
    if (pc.current) {
      await db.collection('rooms').doc(roomId).delete();
      vcaller.current.srcObject.getAudioTracks().forEach((track: any) => {
        track.stop();
        vcaller.current.srcObject.removeTrack(track)
      });
      vcaller.current.srcObject.getVideoTracks().forEach((track: any) => {
        track.stop();
        vcaller.current.srcObject.removeTrack(track)
      });

      pc.current?.close();

      setRoomId("");
      setLocalStream(undefined);
      setRemoteStream(undefined);
      vcaller.current.srcObject = null
    }
  }, [roomId]);

  useEffect(() => {
    const channelDoc = db.collection("rooms");

    const subscribeDelete = channelDoc.onSnapshot((snapshot: any) => {
      snapshot.docChanges().forEach((change: any) => {
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
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then(stream => {
        stream?.getTracks().forEach((track) => {
          pc.current?.addTrack(track, stream);
        })
        vcaller.current.srcObject = stream
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const startCall = async () => {
    pc.current = new RTCPeerConnection(
      server
      // {sdpSemantics: 'unified-plan'}
    );

    stream();
    peerTrack();

    const roomRef = db.collection('rooms').doc();
    setRoomId(roomRef.id)

    collectIceCandidates(roomRef, "caller", "callee")

    const offer = await pc.current?.createOffer();

    await pc.current?.setLocalDescription(offer);

    const roomWithOffer = {
      sdp: offer.sdp,
      type: offer.type
    }

    await roomRef.set({ offer: roomWithOffer });

    roomRef.onSnapshot(async (snapshot: any) => {
      const data = snapshot.data();
      if (!pc.current?.remoteDescription && data && data.answer) {
        const rtcSessionDescription = new RTCSessionDescription(data.answer);
        await pc.current?.setRemoteDescription(rtcSessionDescription);
      }
    });
  }

  const joinCall = async () => {
    const roomRef = await db.collection('rooms').doc(inputValue);
    const roomSnapshot = await roomRef.get();

    if (!roomSnapshot.exists) return endCall();
    setInputValue("")
    setRoomId(inputValue)
    pc.current = new RTCPeerConnection(
      server
      // {sdpSemantics: 'unified-plan'}
    );
    stream();
    peerTrack();

    collectIceCandidates(roomRef, "callee", "caller")

    const offer = roomSnapshot?.data()?.offer;

    await pc.current.setRemoteDescription(new RTCSessionDescription({ type: offer.type, sdp: offer.sdp }));

    const answer = await pc.current.createAnswer();

    await pc.current.setLocalDescription(answer as RTCSessionDescription);

    const roomWithAnswer = {
      sdp: answer.sdp,
      type: answer.type
    }
    await roomRef.update({ answer: roomWithAnswer });

    roomRef.onSnapshot(async snapshot => {
      const data = snapshot.data();
      if (!pc.current?.remoteDescription && data && data.answer) {
        const rtcSessionDescription = new RTCSessionDescription(data.answer);
        await pc.current?.setRemoteDescription(rtcSessionDescription);
      }
    });
  }

  const collectIceCandidates = async (
    roomRef: any,
    localName: string,
    remoteName: string,
  ) => {
    const candidates = roomRef.collection(localName);
    console.log("pc", pc.current);
    pc.current.onicecandidate = (e) => {
      console.log("pc candidate", e.candidate)
    };

    if (pc.current) {
      pc.current.addEventListener("icecandidate", (e: any) => {
        console.log("icecandidate", e);
        if (e.candidate) {
          candidates.add(e.candidate);
        }
      })
    }

    roomRef.collection(remoteName).onSnapshot((snapshot: any) => {
      snapshot.docChanges().forEach(async (change: any) => {
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
      pc.current.addEventListener('icecandidateerror', event => {
        console.log("icecandidateerror", event);
      });
      pc.current.addEventListener('iceconnectionstatechange', event => {
        console.log("iceconnectionstatechange", event);
        switch (pc.current?.iceConnectionState) {
          case 'connected':
            console.log("connected");
            break;
          case 'completed':
            console.log("completed");
            break;
        };
      });
      pc.current.addEventListener("track", (e: any) => {
        console.log('listener track', e);
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


  return (
    <div style={{
      display: 'grid',
      placeItems: 'center'
    }}>
      <p>{roomId}</p>

      {roomId ? <><div style={{ width: 100, padding: 10, borderRadius: 10, backgroundColor: "blue", cursor: 'pointer' }} onClick={() => endCall()}>End Call</div>
        <div style={{ height: 10 }} />
      </> : null}

      {!roomId ? <>
        <div style={{ width: 100, padding: 10, borderRadius: 10, backgroundColor: "blue", cursor: 'pointer' }} onClick={() => startCall()}>Call</div>
        <div style={{ height: 10 }} />
      </> : null}
      
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between"
        }}
      >
        <input placeholder="input room id" value={inputValue} onChange={(e) => setInputValue(e.target.value)} style={{ padding: 10, borderRadius: 10, borderStyle: 'none', backgroundColor: 'lightgrey' }} />
        <div style={{ width: 10 }} />
        <div style={{ width: 50, padding: 10, borderRadius: 10, backgroundColor: "blue", cursor: 'pointer' }} onClick={() => joinCall()}>Join</div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between"
        }}
      >
        <video src="#" ref={vcaller} width={500} height={300} autoPlay playsInline controls={false} />
        <div style={{ width: 20 }} />
        <video src="#" ref={vcallee} width={500} height={300} autoPlay playsInline controls={false} />
      </div>
    </div>
  );
}

export default App;