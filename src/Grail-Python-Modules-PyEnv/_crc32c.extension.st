Extension { #name : '_crc32c' }

{ #category : 'Grail-Built-in Functions' }
_crc32c >> crc32c: data [
	"Python _crc32c.crc32c(data) — fast path. Returns the
	CRC32C of the bytes `data`."

	^ self @env0:class @env0:callCrc32c: data

]

{ #category : 'Grail-Built-in Functions' }
_crc32c >> extend: crc _: data [
	"Python _crc32c.extend(crc, data) — fast path. Extends
	the existing CRC with more bytes."

	^ self @env0:class @env0:callExtend: crc bytes: data

]

{ #category : 'Grail-Initialization' }
_crc32c >> initialize [
	"No-op. The `module>>instance` class method still calls
	`initialize` on the newly-created instance, so this stub keeps
	that contract."

]
