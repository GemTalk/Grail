"Python mimetypes module - guess Content-Type / encoding from filenames.

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
extends the map at runtime."
Class {
	#name : 'mimetypes',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}
