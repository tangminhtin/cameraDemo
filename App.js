import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { Camera } from "expo-camera";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

/** icons: https://icons.expo.fyi/ */

// get window height
const WINDOW_HEIGHT = Dimensions.get("window").height;
const CAPTURE_SIZE = Math.floor(WINDOW_HEIGHT * 0.08); // 80% of window height
const dirs = FileSystem.documentDirectory; // get directory of storing image

export default function App() {
  const cameraRef = useRef();
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
  const [isPreview, setIsPreview] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isFlash, setIsFlash] = useState(Camera.Constants.FlashMode.off);

  /** tracking permission */
  useEffect(() => {
    onHandlePermission();
    onHandleMediaLibrary();
  }, []);

  /** asking the user to grant permission for camera access */
  const onHandlePermission = async () => {
    const { status } = await Camera.requestPermissionsAsync();
    setHasPermission(status === "granted");
  };

  /** asking the user to grant permission for media library access */
  const onHandleMediaLibrary = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
  };

  /** set camera is ready */
  const onCameraReady = () => setIsCameraReady(true);

  /** switch camera */
  const switchCamera = () => {
    if (isPreview) return;
    setCameraType((prevCameraType) =>
      prevCameraType === Camera.Constants.Type.back
        ? Camera.Constants.Type.front
        : Camera.Constants.Type.back
    );
  };

  /** handle when user take a photo */
  const onSnap = async () => {
    if (cameraRef.current) {
      // set options for camera, and take a picture
      const options = { quantity: 0.9, base64: true };
      const data = await cameraRef.current.takePictureAsync(options);
      const source = data.base64;

      // check has taken photo then pause camera to preview photo
      if (source) {
        await cameraRef.current.pausePreview();
        setIsPreview(true);
        storeImage(dirs + "tin_photo.png", source);
        uploadImage(source);
      }
    }
  };

  /** store image to album */
  const storeImage = (fileUri, contents) => {
    FileSystem.writeAsStringAsync(fileUri, contents, {
      encoding: FileSystem.EncodingType.Base64,
    });
    MediaLibrary.saveToLibraryAsync(fileUri); // save image to album
  };

  /** upload image to cloudinary */
  const uploadImage = (source) => {
    let base64Img = `data:image/jpg;base64,${source}`;
    let apiUrl = "https://api.cloudinary.com/v1_1/dxlys0taq/image/upload";
    let data = {
      file: base64Img,
      upload_preset: "react-native-camera-upload",
    };
    // fetch request post to cloudinary
    fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then(async (response) => {
        let data = await response.json();
        if (data.secure_url) {
          alert("Upload successful");
        }
      })
      .catch((err) => {
        alert("Cannot upload");
      });
  };

  /** enable flash */
  const switchFlash = () => {
    setIsFlash((prevFlash) =>
      prevFlash === Camera.Constants.FlashMode.off
        ? Camera.Constants.FlashMode.on
        : Camera.Constants.FlashMode.off
    );
  };

  /** cancel preview photo and continue capture */
  const cancelPreview = async () => {
    await cameraRef.current.resumePreview();
    setIsPreview(false);
  };

  if (hasPermission === null) return <View />;

  if (hasPermission === false) {
    return <Text style={styles.text}>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.container}
        ref={cameraRef}
        type={cameraType}
        onCameraReady={onCameraReady}
        useCamera2Api={true}
        flashMode={isFlash}
      />
      <View style={styles.container}>
        {isPreview && (
          <TouchableOpacity
            onPress={cancelPreview}
            style={styles.closeButton}
            activeOpacity={0.9}
          >
            <AntDesign name="close" size={23} color="#fff" />
          </TouchableOpacity>
        )}
        {!isPreview && (
          <View style={styles.bottomButtonsContainer}>
            <TouchableOpacity disabled={!isCameraReady} onPress={switchCamera}>
              <MaterialIcons name="flip-camera-ios" size={30} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={!isCameraReady}
              onPress={onSnap}
              style={styles.capture}
            />
            <TouchableOpacity disabled={!isCameraReady} onPress={switchFlash}>
              <MaterialIcons
                name={
                  isFlash === Camera.Constants.FlashMode.on
                    ? "flash-on"
                    : "flash-off"
                }
                size={30}
                color="white"
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject, // set View fo full screen and absolute position
  },
  text: {
    color: "#fff",
  },
  bottomButtonsContainer: {
    position: "absolute",
    flexDirection: "row",
    bottom: 28,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  capture: {
    backgroundColor: "#5A45FF",
    height: CAPTURE_SIZE,
    width: CAPTURE_SIZE,
    borderRadius: Math.floor(CAPTURE_SIZE / 2),
    marginBottom: 28,
    marginHorizontal: 30,
  },
  closeButton: {
    position: "absolute",
    bottom: 35,
    right: 20,
    height: 50,
    width: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#5A45FF",
    opacity: 0.7,
  },
});
