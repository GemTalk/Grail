"Python secrets module - cryptographically strong random suitable for
managing secrets like account authentication, tokens, and similar.

Backed by GemStone HostRandom, which sources from the OS CSPRNG.
Mirrors the CPython public surface itsdangerous and Werkzeug consume:
token_bytes / token_hex / token_urlsafe / choice / randbelow /
randbits / compare_digest."
Class {
	#name : 'secrets',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}
