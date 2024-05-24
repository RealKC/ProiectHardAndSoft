import time
import cv2
from multiprocessing import Process, Queue
import base64
import _thread
import os

import Adafruit_BBIO.ADC as ADC
import rel
import websocket
from threading import Thread


class ValueMessage:
    type: str
    value: object

    def __init__(self, type, value):
        self.type = type
        self.value = value


def on_message(ws, message):
    if message == "lights_on":
        os.system("bash /home/debian/ProiectHardAndSoft/beagle/init_pwm.sh")
        return
    elif message == "lights_auto":
        os.system('bash -c "echo 0 > /sys/class/pwm/pwmchip0/pwm0/enable"')
        return
    elif message == "lights_off":
        os.system('bash -c "echo 0 > /sys/class/pwm/pwmchip0/pwm0/enable"')
        return
    elif message == "barrier_on":
        return
    elif message == "barrier_auto":
        return
    elif message == "barrier_off":
        return
    elif message == "blinds_on":
        os.system("node /home/debian/ProiectHardAndSoft/beagle/stepper.js")
        return
    elif message == "blinds_auto":
        return
    elif message == "blinds_off":
        return

    print(message)


def on_error(ws, error):
    print(error)


def on_close(ws, close_status_code, close_msg):
    print("### closed ###")


def upload_task(ws, queue):
    while True:
        try:
            to_upload = queue.get()

            if isinstance(to_upload, ValueMessage):
                msgtyp = to_upload.type
                value = str(to_upload.value).encode(encoding="utf-8")
                if msgtyp == "light":
                    tag = "l"
                elif msgtyp == "temp":
                    tag = "t"
                elif msgtyp == "sun1":
                    tag = "x"
                elif msgtyp == "sun2":
                    tag = "y"

                message = bytes(tag, "utf-8") + value

                ws.send(
                    message,
                    websocket.ABNF.OPCODE_BINARY,
                )
            else:
                ws.send(
                    bytes("i", "utf-8") + to_upload.tobytes(),
                    websocket.ABNF.OPCODE_BINARY,
                )
        except Exception as e:
            print(f"do_upload got exception: {e}\nexiting...")


def on_open(ws, queue: Queue):
    print("Opened connection")
    Thread(target=lambda: upload_task(ws, queue)).start()


def do_upload(queue: Queue):
    # websocket.enableTrace(True)
    ws = websocket.WebSocketApp(
        "wss://houseapi.pushi.party/?key=RANDOM_STUFF&type=beagle",
        on_open=lambda ws: on_open(ws, queue),
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    )

    ws.run_forever()  # Set disp


encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 90]


def do_capture(queue: Queue):
    camera = cv2.VideoCapture(0, apiPreference=cv2.CAP_V4L2)
    camera.setExceptionMode(True)
    camera.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc("M", "J", "P", "G"))
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 504)
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 896)

    while True:
        time.sleep(0.1)

        try:
            success, image = camera.read()

            if not success:
                continue

            success, buffer = cv2.imencode(".jpg", image, encode_param)
        except Exception as e:
            print(f"do_capture got exception: {e}, {e.code}")
            camera.release()
        try:
            queue.put_nowait(buffer)
        except Exception as e:
            print(e)
            continue


def do_read_adc(queue: Queue):
    outside_1 = "P9_39"
    outside_2 = "P9_40"
    inside = "P9_41"
    thermistor = "P9_42"
    ADC.setup()

    while True:
        time.sleep(0.1)
        outside_1_value = ADC.read_raw(outside_1) / 4095.0
        outside_2_value = ADC.read_raw(outside_2) / 4095.0
        inside_value = ADC.read_raw(inside) / 4095.0
        themp = ADC.read_raw(thermistor)

        # outside_1_value = 0.3
        # outside_2_value = 0.4
        # inside_value = 0.5
        # themp = 2000

        try:
            queue.put_nowait(ValueMessage("light", inside_value))
            queue.put_nowait(ValueMessage("sun1", outside_1_value))
            queue.put_nowait(ValueMessage("sun2", outside_2_value))
            queue.put_nowait(ValueMessage("temp", themp))
        except:
            continue


def main():
    queue = Queue()

    for func in [do_capture, do_upload, do_read_adc]:  # do_capture
        Process(target=func, args=(queue,)).start()


if __name__ == "__main__":
    main()
