TSCFLAGS = -tes2017

build: $(patsubst %.ts, %.js, $(wildcard *.ts))

%.js: %.ts
	tsc $<

%phony: build
