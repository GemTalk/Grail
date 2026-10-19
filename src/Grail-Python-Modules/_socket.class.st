"Python ``_socket' -- the low-level socket module CPython implements in C
and Grail implements over GemStone ``GsSocket'.

Exists so that CPython's own ``socket.py' can run unmodified on top: its
whole coupling to C is ``import _socket' plus ``from _socket import *'.

The integer constants here never reach the operating system -- GsSocket
takes NAMED options -- so they only have to agree with each other.  Linux
values are used because they are the ones people recognise."
Class {
	#name : '_socket',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}
