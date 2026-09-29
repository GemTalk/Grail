# libgrail_ssl: the OpenSSL callbacks _ssl.py cannot make through CCallout
# alone (see grail_ssl.c).  A plain shared library, loaded by CCallout; it
# dlopens GemStone's libssl itself, so it needs no GemStone or OpenSSL headers.
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
  EXT = dylib
  SHARED = -dynamiclib
  LIBS =
else
  EXT = so
  SHARED = -shared
  LIBS = -ldl
endif
LIB = libgrail_ssl.$(EXT)

all: $(LIB)

$(LIB): grail_ssl.c
	cc -std=c99 -D_POSIX_C_SOURCE=200809L -Wall -Wextra -Wconversion -Wno-sign-conversion \
	    -fPIC -O2 $(SHARED) -o $(LIB) grail_ssl.c $(LIBS)

clean:
	rm -f $(LIB)
