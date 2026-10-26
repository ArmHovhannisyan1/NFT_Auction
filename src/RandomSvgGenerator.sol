// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import "@openzeppelin/contracts/utils/Strings.sol";

library RandomSvgGenerator {
    using Strings for uint256;

    // Helper to fetch the color palette from memory
    function getColorPalette() internal pure returns (string[6] memory) {
        return ["#FF5733", "#33FF57", "#3357FF", "#F3FF33", "#33FFF0", "#800080"];
    }

    // SVG header and footer constants (Strings are okay as long as they aren't arrays)
    string private constant SVG_HEADER = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'>";
    string private constant SVG_FOOTER = "</svg>";

    // Generate SVG bytes for a given tokenId (DNA)
    // Generate SVG bytes for a given tokenId (DNA) and contractAddress
    function generateRawSvg(uint256 tokenId, address contractAddress) internal pure returns (string memory) {
        // Load the colors array into memory
        string[6] memory colors = getColorPalette();
        uint256 totalColors = 6;

        // Derive a pseudorandom seed from tokenId and contractAddress
        uint256 dna = uint256(keccak256(abi.encodePacked(tokenId, contractAddress)));

        // Select colors and shapes using DNA segments
        string memory shapeColor1 = colors[dna % totalColors];
        string memory shapeColor2;
        {
            uint256 colorIdx1 = dna % totalColors;
            uint256 colorIdx2 = (dna >> 8) % totalColors;
            if (colorIdx1 == colorIdx2) {
                colorIdx2 = (colorIdx2 + 1) % totalColors;
            }
            shapeColor2 = colors[colorIdx2];
        }

        // Shape 1 (Circle) block scope
        bytes memory shape1Bytes;
        {
            uint256 cx = 60 + (dna % 121); // 60..180
            uint256 cy = 60 + ((dna >> 4) % 121);
            uint256 r = 20 + ((dna >> 16) % 60); // 20..79
            shape1Bytes = abi.encodePacked(
                "<circle cx='",
                cx.toString(),
                "' cy='",
                cy.toString(),
                "' r='",
                r.toString(),
                "' fill='",
                shapeColor1,
                "' fill-opacity='0.8'/>"
            );
        }

        // Shape 2 (Rotated rectangle) block scope
        bytes memory shape2Bytes;
        {
            uint256 rectX = (dna >> 32) % 180;
            uint256 rectY = (dna >> 40) % 180;
            uint256 size = 30 + ((dna >> 48) % 60); // 30..89
            uint256 angle = (dna >> 56) % 360; // rotation
            shape2Bytes = abi.encodePacked(
                "<rect x='",
                rectX.toString(),
                "' y='",
                rectY.toString(),
                "' width='",
                size.toString(),
                "' height='",
                size.toString(),
                "' fill='",
                shapeColor2,
                "' transform='rotate(",
                angle.toString(),
                " ",
                (rectX + size / 2).toString(),
                " ",
                (rectY + size / 2).toString(),
                ")'/>"
            );
        }

        // Assemble and return the complete SVG
        return string(
            abi.encodePacked(
                SVG_HEADER,
                "<rect width='240' height='240' fill='",
                colors[dna % totalColors], // Background color
                "'/>",
                shape1Bytes,
                shape2Bytes,
                "<text x='120' y='230' fill='#FFFFFF' font-size='14' text-anchor='middle'>#",
                tokenId.toString(),
                "</text>",
                SVG_FOOTER
            )
        );
    }
}
