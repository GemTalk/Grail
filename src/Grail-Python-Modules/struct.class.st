"Python struct module - binary pack/unpack between Python values
and bytes per a format string.

Supported format characters:
  Byte-order/size: @ = < > ! (native, standard, little, big,
                              network=big)
  Integers:       b B h H i I l L q Q n N
  Floats:         e f d (16/32/64-bit IEEE half, single, double)
  Bytes:          s (counted bytes; 5s = 5-byte field)
                  p (Pascal string: leading length byte)
  Padding:        x (one zero byte, no value)
  Other:          c (single byte as length-1 bytes), ? (bool)

Unsupported (raises struct.error):
  F D (complex, new in 3.14), P (void pointer)

THERE ARE TWO LAYOUT MODES, and the default is the surprising one.

  NATIVE (``@', or no prefix at all) uses the C compiler's sizes AND
  INSERTS ALIGNMENT PADDING, exactly as the equivalent C struct would:

      calcsize('ci')  = 8    c, 3 pad bytes, then a 4-aligned i
      calcsize('l')   = 8    native long is 8 bytes on 64-bit

  STANDARD (``=' ``<' ``>' ``!') uses fixed sizes and NO padding:

      calcsize('=ci') = 5
      calcsize('=l')  = 4

Grail previously implemented only the standard sizes, with no padding, and
applied them to native formats too -- so every unprefixed mixed-type format
silently produced the wrong layout and the wrong size.  Since the unprefixed
form is what most code writes, that was the common case rather than a corner.

There is NO trailing padding: calcsize('@qc') is 9, not 16.  A zero repeat
count still aligns, which is what ``0i' is for.

n and N are native-only, and naming them under a standard prefix is an error
(``bad char in struct format'), not a silently different size."
Class {
	#name : 'struct',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}
