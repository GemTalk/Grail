! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- mimetypes module class
expectvalue /Class
doit
module subclass: 'mimetypes'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
mimetypes comment:
'Python mimetypes module - guess Content-Type / encoding from filenames.

Surface for Werkzeug Response/send_file:
  guess_type(url[, strict])         - (mimetype, encoding) tuple
  guess_extension(type[, strict])   - leading-dot extension or None
  add_type(type, ext[, strict])     - register at runtime
  init([files])                     - no-op; the global map is already
                                       populated at import time
  inited                            - bool flag, True after import
  types_map / common_types / encodings_map / suffix_map - constants

The bundled map covers the IANA-registered MIME types served by Flask
and Werkzeug in practice; if a user needs something exotic, add_type
extends the map at runtime.'
%

expectvalue /Class
doit
mimetypes category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
mimetypes removeAllMethods: 0.
mimetypes removeAllMethods: 1.
mimetypes class removeAllMethods: 0.
mimetypes class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: mimetypes
initialize
	"Populate the lookup tables.  Keys are lowercase extensions
	*including* the leading dot."

	| types encodings suffixes |
	types := dict @env1:___new___.
	#(
		#('.html' 'text/html')
		#('.htm' 'text/html')
		#('.shtml' 'text/html')
		#('.css' 'text/css')
		#('.xml' 'text/xml')
		#('.gif' 'image/gif')
		#('.jpeg' 'image/jpeg')
		#('.jpg' 'image/jpeg')
		#('.js' 'text/javascript')
		#('.mjs' 'text/javascript')
		#('.atom' 'application/atom+xml')
		#('.rss' 'application/rss+xml')
		#('.txt' 'text/plain')
		#('.png' 'image/png')
		#('.ico' 'image/vnd.microsoft.icon')
		#('.svg' 'image/svg+xml')
		#('.svgz' 'image/svg+xml')
		#('.tif' 'image/tiff')
		#('.tiff' 'image/tiff')
		#('.bmp' 'image/bmp')
		#('.webp' 'image/webp')
		#('.json' 'application/json')
		#('.pdf' 'application/pdf')
		#('.zip' 'application/zip')
		#('.gz' 'application/gzip')
		#('.tar' 'application/x-tar')
		#('.csv' 'text/csv')
		#('.md' 'text/markdown')
		#('.mp3' 'audio/mpeg')
		#('.wav' 'audio/wav')
		#('.mp4' 'video/mp4')
		#('.webm' 'video/webm')
		#('.woff' 'font/woff')
		#('.woff2' 'font/woff2')
		#('.ttf' 'font/ttf')
		#('.otf' 'font/otf')
		#('.eot' 'application/vnd.ms-fontobject')
	) @env0:do: [:pair |
		types @env1:__setitem__: (pair @env0:at: 1) _: (pair @env0:at: 2)
	].
	encodings := dict @env1:___new___.
	#(
		#('.gz' 'gzip')
		#('.Z' 'compress')
		#('.bz2' 'bzip2')
		#('.xz' 'xz')
		#('.br' 'br')
	) @env0:do: [:pair |
		encodings @env1:__setitem__: (pair @env0:at: 1) _: (pair @env0:at: 2)
	].
	suffixes := dict @env1:___new___.
	#(
		#('.tgz' '.tar.gz')
		#('.taz' '.tar.gz')
		#('.tz' '.tar.gz')
		#('.tbz2' '.tar.bz2')
		#('.txz' '.tar.xz')
	) @env0:do: [:pair |
		suffixes @env1:__setitem__: (pair @env0:at: 1) _: (pair @env0:at: 2)
	].
	self @env0:at: #types_map put: types.
	self @env0:at: #common_types put: (dict @env1:___new___).
	self @env0:at: #encodings_map put: encodings.
	self @env0:at: #suffix_map put: suffixes.
	self @env0:at: #inited put: true
%

category: 'Grail-Accessors'
method: mimetypes
types_map
	^ self @env0:at: #types_map
%

category: 'Grail-Accessors'
method: mimetypes
common_types
	^ self @env0:at: #common_types
%

category: 'Grail-Accessors'
method: mimetypes
encodings_map
	^ self @env0:at: #encodings_map
%

category: 'Grail-Accessors'
method: mimetypes
suffix_map
	^ self @env0:at: #suffix_map
%

category: 'Grail-Accessors'
method: mimetypes
inited
	^ self @env0:at: #inited ifAbsent: [false]
%

category: 'Grail-Public'
method: mimetypes
init
	"init() / init([files]) - CPython rebuilds the map; here it is a
	no-op since the map is already populated at module load."

	^ None
%

category: 'Grail-Public'
method: mimetypes
init: filenames
	^ None
%

category: 'Grail-Public'
method: mimetypes
guess_type: url
	^ self @env1:guess_type: url _: true
%

category: 'Grail-Public'
method: mimetypes
guess_type: url _: strict
	"guess_type(url, strict=True) - return a (type, encoding) tuple.
	The path is split on `.` from the right; the trailing segment is
	the extension.  Suffix-map redirection handles `.tgz` => `.tar.gz`
	with `.tar.gz` then splitting into encoding=`gzip`, type from
	`.tar`."

	| path ext encoding type idx suffixes |
	path := url @env0:asString.
	encoding := nil.
	"Strip query / fragment - Werkzeug rarely passes those, but be
	safe: split on `?` and `#`."
	idx := path @env0:indexOf: $?.
	idx @env0:> 0 ifTrue: [path := path @env0:copyFrom: 1 to: idx @env0:- 1].
	idx := path @env0:indexOf: $#.
	idx @env0:> 0 ifTrue: [path := path @env0:copyFrom: 1 to: idx @env0:- 1].
	"Suffix map: rewrite known compound extensions."
	suffixes := self @env1:suffix_map.
	ext := self @env1:___extOf___: path.
	(suffixes @env0:includesKey: ext @env0:asLowercase) ifTrue: [
		path := (path @env0:copyFrom: 1 to: path @env0:size @env0:- ext @env0:size)
			@env0:, (suffixes @env0:at: ext @env0:asLowercase).
		ext := self @env1:___extOf___: path
	].
	ext @env0:isEmpty ifTrue: [
		^ tuple @env0:withAll: { None. None }
	].
	"Walk off encoding suffix if present (`.gz` -> gzip, etc.)."
	(self @env1:encodings_map @env0:includesKey: ext @env0:asLowercase) ifTrue: [
		encoding := self @env1:encodings_map @env0:at: ext @env0:asLowercase.
		path := path @env0:copyFrom: 1 to: path @env0:size @env0:- ext @env0:size.
		ext := self @env1:___extOf___: path
	].
	type := self @env1:types_map @env0:at: ext @env0:asLowercase ifAbsent: [nil].
	type @env0:== nil ifTrue: [
		^ tuple @env0:withAll: {
			None.
			encoding @env0:== nil ifTrue: [None] ifFalse: [encoding]
		}
	].
	^ tuple @env0:withAll: {
		type.
		encoding @env0:== nil ifTrue: [None] ifFalse: [encoding]
	}
%

category: 'Grail-Public'
method: mimetypes
guess_extension: aType
	^ self @env1:guess_extension: aType _: true
%

category: 'Grail-Public'
method: mimetypes
guess_extension: aType _: strict
	"guess_extension(type, strict=True) - return an extension for a
	MIME type, or None if not registered.  Reverse lookup over
	types_map; first match wins."

	| target |
	target := aType @env0:asString @env0:asLowercase.
	self @env1:types_map @env0:keysAndValuesDo: [:k :v |
		v @env0:asLowercase @env0:= target ifTrue: [^ k]
	].
	^ None
%

category: 'Grail-Public'
method: mimetypes
add_type: aType _: ext
	^ self @env1:add_type: aType _: ext _: true
%

category: 'Grail-Public'
method: mimetypes
add_type: aType _: ext _: strict
	"add_type(type, ext, strict=True) - register a runtime mapping
	from extension to MIME type."

	self @env1:types_map @env1:__setitem__: ext _: aType.
	^ None
%

category: 'Grail-Private'
method: mimetypes
___extOf___: path
	"Return the trailing extension of `path` *including* its leading
	dot, or the empty string if no extension is present.  Splits on
	the last `.` after the final `/`."

	| slashIdx lastDot |
	slashIdx := 0.
	1 @env0:to: path @env0:size do: [:i |
		(path @env0:at: i) @env0:= $/ ifTrue: [slashIdx := i]
	].
	lastDot := 0.
	(slashIdx @env0:+ 1) @env0:to: path @env0:size do: [:i |
		(path @env0:at: i) @env0:= $. ifTrue: [lastDot := i]
	].
	lastDot @env0:= 0 ifTrue: [^ ''].
	^ path @env0:copyFrom: lastDot to: path @env0:size
%

set compile_env: 0
