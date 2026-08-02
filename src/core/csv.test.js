import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv.js";

describe("parseCsv", () => {
  it("separa filas y columnas simples", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("respeta comas dentro de comillas", () => {
    expect(parseCsv('nombre,nota\n"Pérez, Juan","hola, mundo"')).toEqual([
      ["nombre", "nota"],
      ["Pérez, Juan", "hola, mundo"],
    ]);
  });

  it("des-escapa comillas dobles dentro de un campo entre comillas", () => {
    expect(parseCsv('a\n"dijo ""hola"""')).toEqual([["a"], ['dijo "hola"']]);
  });

  it("respeta saltos de línea dentro de comillas", () => {
    expect(parseCsv('a\n"linea1\nlinea2"')).toEqual([["a"], ["linea1\nlinea2"]]);
  });

  it("ignora CRLF", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("ida y vuelta con toCsv para valores con comas/comillas", () => {
    const headers = ["nombre", "nota"];
    const rows = [["Pérez, Juan", 'dijo "hola"']];
    expect(parseCsv(toCsv(headers, rows))).toEqual([headers, rows[0]]);
  });
});
