{
  description = "Develop Python on Nix with uv";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.11";
  };

  outputs =
    inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } (
      { ... }:
      {
        systems = [
          "x86_64-linux"
          "aarch64-linux"
          "x86_64-darwin"
          "aarch64-darwin"
        ];
        perSystem =
          {
            system,
            pkgs,
            lib,
            self',
            ...
          }:
          let
            # Create an alias for python packages, such that we can use the same python version for everything
            py = pkgs.python313Packages;

          in
          {
            _module.args.pkgs = import inputs.nixpkgs {
              inherit system;
              config = { };
            };

            devShells.default = pkgs.mkShell (
              let
                runtimePkgs =
                  with pkgs;
                  lib.optionals stdenv.isLinux [
                    gcc13
                    openssl_3_6
                  ];
                stdenv = pkgs.stdenv;

              in
              {
                packages = with pkgs; [
                  py.python
                  # py.venvShellHook
                  py.build
                  py.mypy

                  cmake
                  gnumake

                  maturin

                  typos
                  dprint
                  uv

                  zlib

                  samply
                  hyperfine

                  graphviz

                  openssl
                  pkg-config

                  bun

                  opencode
                ];

                buildInputs = runtimePkgs;

                # venvDir = ".venv";

                # env = lib.optionalAttrs pkgs.stdenv.isLinux {
                #   # Python libraries often load native shared objects using dlopen(3).
                #   # Setting LD_LIBRARY_PATH makes the dynamic library loader aware of libraries without using RPATH for lookup.
                #   LD_LIBRARY_PATH = lib.makeLibraryPath pkgs.pythonManylinuxPackages.manylinux1;
                # };
                # shellHook = ''
                #   unset PYTHONPATH
                #   uv sync
                #   . .venv/bin/activate
                # '';
              }
            );
          };
      }
    );
}
