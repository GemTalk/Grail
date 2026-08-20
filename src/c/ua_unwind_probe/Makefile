# Minimal user action library for GemStone_Feature_Requests 1.5.
# Needs $GEMSTONE set (source ./.setenv).
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
  EXT = dylib
  SHARED = -dynamiclib -undefined dynamic_lookup
else
  EXT = so
  SHARED = -shared
endif
LIB = libua_unwind_probe.$(EXT)

all: $(LIB)

$(LIB): ua_unwind_probe.cc
	c++ -Wall -Wextra -Wno-unused-parameter -fPIC -O2 -I$(GEMSTONE)/include \
	    $(SHARED) -o $(LIB) ua_unwind_probe.cc $(GEMSTONE)/lib/gciualib.o

clean:
	rm -f $(LIB)
