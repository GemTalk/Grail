"Python _sre C extension module (regular expression engine).

Provides the low-level SRE matching engine used by the re module.
This wrapper delegates to CPythonShim which calls the actual C
implementation of _sre compiled from CPython 3.14 source.

Usage (from Python source):
    import _sre
    _sre.getcodesize()   # => 4
    pattern = _sre.compile(...)
    match = pattern.search(""hello"")

"
Class {
	#name : '_sre',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
_sre class >> callAsciiIscased: character [
	"Call _sre.ascii_iscased(character) via CPythonShim."

	^ CPythonShim current
		callModule: '_sre'
		method: 'ascii_iscased'
		with: character

]

{ #category : 'Grail-Private' }
_sre class >> callAsciiTolower: character [
	"Call _sre.ascii_tolower(character) via CPythonShim."

	^ CPythonShim current
		callModule: '_sre'
		method: 'ascii_tolower'
		with: character

]

{ #category : 'Grail-Private' }
_sre class >> callCompile: pattern flags: flags code: code groups: groups groupindex: groupindex indexgroup: indexgroup [
	"Call _sre.compile(...) → returns C pointer (SmallInteger).

	A nil/None pattern is legal in CPython (re.Scanner compiles a combined
	SubPattern with pattern=None; the C side only stores it as .pattern),
	but the shim's marshalling wants a string, so substitute '' -- the
	compiled matcher is driven entirely by `code`, not by `pattern`."

	| pat |
	pat := (pattern == nil @env0:or: [pattern == None]) ifTrue: [''] ifFalse: [pattern].
	^ CPythonShim current
		callModule6ReturnCPtr: '_sre.compile'
		with: pat with: flags with: code
		with: groups with: groupindex with: indexgroup

]

{ #category : 'Grail-Private' }
_sre class >> callGetcodesize [
	"Call _sre.getcodesize() via CPythonShim."

	^ CPythonShim current
		callModule: '_sre'
		method: 'getcodesize'

]

{ #category : 'Grail-Private' }
_sre class >> callUnicodeIscased: character [
	"Call _sre.unicode_iscased(character) via CPythonShim."

	^ CPythonShim current
		callModule: '_sre'
		method: 'unicode_iscased'
		with: character

]

{ #category : 'Grail-Private' }
_sre class >> callUnicodeTolower: character [
	"Call _sre.unicode_tolower(character) via CPythonShim."

	^ CPythonShim current
		callModule: '_sre'
		method: 'unicode_tolower'
		with: character

]
