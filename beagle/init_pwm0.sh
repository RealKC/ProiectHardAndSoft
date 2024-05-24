#!/usr/bin/env bash

cd /sys/class/pwm/pwmchip0/

echo 0 > export

cd pwm0

echo 10000 > period
echo 5000 > duty_cycle
echo 1 > enable

config-pin p9.42 pwm

